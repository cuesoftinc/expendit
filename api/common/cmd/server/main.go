// Command server is api/common: the HTTP API, the Kafka consumers and the
// outbox publisher in one process (system-design.md §4). In cloud it scales
// to zero with CPU always allocated: whatever publishes for it wakes it
// (§16 I-16), and it wakes analytics in turn.
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
	"github.com/cuesoftinc/expendit/api/common/internal/auth"
	"github.com/cuesoftinc/expendit/api/common/internal/config"
	"github.com/cuesoftinc/expendit/api/common/internal/handler"
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
	wakeFor := map[string]string{
		kafka.EventImportReady:      cfg.Wake.Extract,
		kafka.EventStatementReady:   cfg.Wake.Extract,
		kafka.EventComputeRequested: cfg.Wake.Compute,
	}
	publisher := &outbox.Publisher{DB: a.DB, Producer: producer, Interval: time.Second,
		Wake: func(event string) { waker.Async(wakeFor[event], event) }}

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
	for topic, handlers := range consumers {
		c, err := kafka.NewConsumer(cfg.Kafka, "expendit-common", topic, handlers, a.Contract, a.Store)
		if err != nil {
			return err
		}
		c.Failures = failures[topic]
		running = append(running, c)
	}

	verifier := auth.NewVerifier(cfg.FirebaseProjectID, cfg.FirebaseEmulatorHost != "")
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
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router.New(h, middleware.Authenticate(verifier, a.Identity), cfg.CORSOrigins, ready),
		ReadHeaderTimeout: 10 * time.Second,
	}

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error { publisher.Run(gctx); return nil })
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
