// Command server is api/common: the HTTP API, the Kafka consumers and the
// outbox publisher in one process (system-design.md §4). In cloud it scales
// to zero on request-based CPU: a write publishes its outbox rows before it
// answers, whatever publishes for it settles it (POST /internal/settle,
// §16 I-16), and it settles analytics in turn.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/cuesoftinc/expendit/api/common/internal/app"
	"github.com/cuesoftinc/expendit/api/common/internal/config"
	"github.com/cuesoftinc/expendit/api/common/internal/handler"
	"github.com/cuesoftinc/expendit/api/common/internal/jobs"
	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/cuesoftinc/expendit/api/common/internal/outbox"
	"github.com/cuesoftinc/expendit/api/common/internal/router"
	"github.com/cuesoftinc/expendit/api/common/internal/service"
	"github.com/cuesoftinc/expendit/api/common/internal/wake"
	"github.com/cuesoftinc/expendit/api/common/migrations"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if err := run(); err != nil {
		slog.Error("exiting", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	a, err := app.New(ctx, cfg)
	if err != nil {
		return err
	}
	defer a.Close()

	if err := migrations.Apply(ctx, a.DB.Pool); err != nil {
		return err
	}
	if err := service.SeedRulesets(ctx, a.DB); err != nil {
		return err
	}

	producer, err := kafka.NewProducer(cfg.Kafka, a.Contract, a.Store)
	if err != nil {
		return err
	}
	defer producer.Close()
	waker := wake.New()
	settleFor := map[string]string{
		kafka.EventImportReady:      cfg.Wake.Extract,
		kafka.EventStatementReady:   cfg.Wake.Extract,
		kafka.EventComputeRequested: cfg.Wake.Compute,
	}
	publisher := &outbox.Publisher{DB: a.DB, Producer: producer, Interval: time.Second,
		Wake: settleConsumers(waker, settleFor)}

	consumers := map[string]map[string]kafka.Handler{
		kafka.TopicUploads: {
			kafka.EventUploadReceived: func(ctx context.Context, raw json.RawMessage) error {
				return a.Imports.OnUploadReceived(ctx, raw, a.Statements.UploadRouter())
			},
		},
		kafka.TopicResults: {
			kafka.EventImportProcessed: a.Imports.OnImportProcessed,
			kafka.EventStatementMapped: a.Statements.OnStatementMapped,
			kafka.EventComputeResults:  a.Compute.OnComputeResults,
		},
	}
	failures := map[string]map[string]kafka.Failer{
		kafka.TopicUploads: {kafka.EventUploadReceived: a.Imports.OnUploadReceivedFailed},
		kafka.TopicResults: {
			kafka.EventImportProcessed: a.Imports.OnImportProcessedFailed,
			kafka.EventStatementMapped: a.Statements.OnStatementMappedFailed,
			kafka.EventComputeResults:  a.Compute.OnComputeResultsFailed,
		},
	}
	var running []*kafka.Consumer
	var waiters []waiter
	for topic, handlers := range consumers {
		c, err := kafka.NewConsumer(cfg.Kafka, "expendit-common", topic, handlers, a.Contract, a.Store)
		if err != nil {
			return err
		}
		c.Failures = failures[topic]
		running = append(running, c)
		waiters = append(waiters, c)
	}
	drain := drainAll(waiters)
	publish := publishOutbox(publisher)
	settle := settler{drain: drain, publish: publish, budget: settleBudget}

	sso := &handler.SSO{
		Settings: handler.SSOSettings{
			RedirectURI:       cfg.Auth.GoogleRedirectURI,
			SessionCookieName: cfg.Auth.SessionCookieName,
			OAuthStateCookie:  cfg.Auth.OAuthStateCookie,
			SessionTTL:        cfg.Auth.JWTAccessTTL,
			Secure:            cfg.Auth.SecureCookies,
			FrontendURL:       cfg.CORSOrigins[0],
			Origins:           cfg.CORSOrigins,
		},
		Store: a.SSOState, Google: a.Google, Handoffs: a.Handoffs, Users: a.Identity, Log: slog.Default(),
	}
	session := middleware.Session{Tokens: a.Tokens, CookieName: cfg.Auth.SessionCookieName, Origins: cfg.CORSOrigins}
	h := &handler.Handlers{Identity: a.Identity, Ledger: a.Ledger, Imports: a.Imports, Statements: a.Statements, Compute: a.Compute}
	ready := func(ctx context.Context) error {
		if err := a.DB.Ping(ctx); err != nil {
			return err
		}
		for _, c := range running {
			if !c.Running() {
				return errors.New("consumer stopped")
			}
		}
		return nil
	}
	reaperSettle := func(ctx context.Context) error {
		if !settle.run(ctx) {
			return errors.New("consumers still behind")
		}
		return nil
	}
	scheduled := middleware.SchedulerAuth(middleware.GoogleVerifier{}, cfg.SchedulerAudience, cfg.SchedulerInvokerEmail)(
		handler.RunJob(jobs.New(a, producer, reaperSettle)))
	settleCallers := append([]string{cfg.SchedulerInvokerEmail}, cfg.SettleInvokers...)
	settled := middleware.InternalAuth(middleware.GoogleVerifier{}, cfg.SchedulerAudience, settleCallers...)(
		handler.Settle(settle.run))
	var api http.Handler = router.New(h, sso, middleware.Authenticate(session, a.Identity), cfg.CORSOrigins, ready, scheduled, settled)
	if cfg.OnCloudRun {
		// Request-based CPU: publish before the first byte, never after it.
		api = flushBeforeResponse(api, flushOutbox(publish, drain))
	}
	srv := &http.Server{Addr: ":" + cfg.Port, Handler: api, ReadHeaderTimeout: 10 * time.Second}

	g, gctx := errgroup.WithContext(ctx)
	if !cfg.OnCloudRun {
		g.Go(func() error { publisher.Run(gctx); return nil })
	}
	for _, c := range running {
		g.Go(func() error { return c.Run(gctx) })
	}
	g.Go(func() error {
		slog.Info("listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	})
	g.Go(func() error {
		<-gctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdown)
	})
	// A consumer stops only when Kafka fails: the platform restarts the
	// process and uncommitted messages are redelivered.
	return g.Wait()
}
