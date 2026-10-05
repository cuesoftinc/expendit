// Command jobs runs one scheduled job and exits (system-design.md §6.7):
//
//	jobs reaper | tmp-cleanup | retention | migrate | republish-rulesets
//
// Cloud Scheduler triggers each as a Cloud Run job from this image.
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
	"github.com/cuesoftinc/expendit/api/common/internal/service"
	"github.com/cuesoftinc/expendit/api/common/internal/sweep"
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

	jobs := (&sweep.Sweeper{DB: a.DB, Store: a.Store, Now: time.Now}).Jobs()
	jobs["migrate"] = func(ctx context.Context) error { return migrations.Apply(ctx, a.DB.Pool) }
	jobs["republish-rulesets"] = func(ctx context.Context) error { return service.RepublishRulesets(ctx, a.DB) }

	names := make([]string, 0, len(jobs))
	for name := range jobs {
		names = append(names, name)
	}
	sort.Strings(names)
	if len(args) != 1 || jobs[args[0]] == nil {
		return fmt.Errorf("usage: jobs <%s>", strings.Join(names, "|"))
	}
	start := time.Now()
	if err := jobs[args[0]](ctx); err != nil {
		return err
	}
	slog.Info("job done", "job", args[0], "ms", time.Since(start).Milliseconds())
	return nil
}
