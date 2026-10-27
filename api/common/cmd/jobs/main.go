// Command jobs runs one scheduled job and exits (system-design.md §6.7):
//
//	jobs reaper | tmp-cleanup | retention | migrate | heartbeat
//
// Cloud Scheduler triggers the sweeps over HTTP instead (POST /internal/jobs/{name} on the server).
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"sort"
	"strings"
	"syscall"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/app"
	"github.com/cuesoftinc/expendit/api/common/internal/config"
	"github.com/cuesoftinc/expendit/api/common/internal/jobs"
	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/migrations"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if err := run(os.Args[1:]); err != nil {
		slog.Error("job failed", "error", err)
		os.Exit(1)
	}
}

func run(args []string) error {
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

	producer, err := kafka.NewProducer(cfg.Kafka, a.Contract, a.Store)
	if err != nil {
		return err
	}
	defer producer.Close()

	all := jobs.New(a, producer)
	all["migrate"] = func(ctx context.Context) error { return migrations.Apply(ctx, a.DB.Pool) }

	names := make([]string, 0, len(all))
	for name := range all {
		names = append(names, name)
	}
	sort.Strings(names)
	if len(args) != 1 || all[args[0]] == nil {
		return fmt.Errorf("usage: jobs <%s>", strings.Join(names, "|"))
	}
	start := time.Now()
	if err := all[args[0]](ctx); err != nil {
		return err
	}
	slog.Info("job done", "job", args[0], "ms", time.Since(start).Milliseconds())
	return nil
}
