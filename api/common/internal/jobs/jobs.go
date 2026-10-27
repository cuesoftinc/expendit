// Package jobs builds the scheduled-job map shared by cmd/jobs (by hand) and
// POST /internal/jobs/{name} (Cloud Scheduler).
package jobs

import (
	"context"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/aiven"
	"github.com/cuesoftinc/expendit/api/common/internal/app"
	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/service"
	"github.com/cuesoftinc/expendit/api/common/internal/sweep"
	"github.com/cuesoftinc/expendit/api/common/internal/wake"
)

// New returns every sweep job plus heartbeat (check the Kafka connection, or
// wake an idle Kafka service); migrate is added by cmd/jobs only.
func New(a *app.App, producer *kafka.Producer) map[string]func(context.Context) error {
	cfg := a.Config
	sweeper := &sweep.Sweeper{DB: a.DB, Store: a.Store, Now: time.Now, Wake: wake.New(), WakeURLs: cfg.Wake,
		Aiven:     aiven.New(cfg.Aiven.APIToken, cfg.Aiven.Project, cfg.Aiven.KafkaService),
		Heartbeat: func(ctx context.Context) error { return producer.Heartbeat(ctx, "reaper") },
		Resend: func(ctx context.Context) (int, error) {
			stuck, err := service.ResendStuck(ctx, a.DB, a.Imports, a.Statements)
			if err != nil {
				return stuck, err
			}
			compute, err := service.ResendCompute(ctx, a.DB)
			return stuck + compute, err
		},
	}
	jobs := map[string]func(context.Context) error{}
	for name, fn := range sweeper.Jobs() {
		jobs[name] = fn
	}
	jobs["heartbeat"] = sweeper.Heartbeat
	return jobs
}
