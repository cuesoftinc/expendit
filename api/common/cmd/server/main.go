// Command server is api/common: the HTTP API, the Kafka consumers and the
// outbox publisher in one process (system-design.md §4; min 1 instance in
// cloud, S-12, because it consumes).
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
	publisher := &outbox.Publisher{DB: a.DB, Producer: producer, Interval: time.Second}

	consumers := map[string]kafka.Handler{
		kafka.TopicUploadReceived: func(ctx context.Context, raw json.RawMessage) error {
			return a.Imports.OnUploadReceived(ctx, raw, a.Statements.UploadRouter())
		},
		kafka.TopicImportProcessed: a.Imports.OnImportProcessed,
		kafka.TopicStatementMapped: a.Statements.OnStatementMapped,
		kafka.TopicComputeResults:  a.Compute.OnComputeResults,
	}
	var running []*kafka.Consumer
	for topic, handle := range consumers {
		c, err := kafka.NewConsumer(cfg.Kafka, "expendit-common", topic, handle, a.Contract, a.Store)
		if err != nil {
			return err
		}
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
	// A consumer that fails stops the whole process: the platform restarts
	// it and the uncommitted message is redelivered.
	return g.Wait()
}
