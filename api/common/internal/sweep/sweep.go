// Package sweep holds the scheduled jobs (system-design.md §6.7). Cloud
// Scheduler runs them over HTTP on common (POST /internal/jobs/{name}) and
// cmd/jobs runs them by hand; all are lookup-then-write and safe to run twice.
package sweep

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/aiven"
	"github.com/cuesoftinc/expendit/api/common/internal/config"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/storage"
	"github.com/cuesoftinc/expendit/api/common/internal/wake"
)

type Sweeper struct {
	DB    *repository.DB
	Store storage.Store
	Now   func() time.Time
	// Wake and WakeURLs let the reaper restart scaled-to-zero services
	// while work is pending (§16 I-16). Nil/empty: nothing to wake.
	Wake     *wake.Waker
	WakeURLs config.Wake

	// Keeping the shared Aiven Kafka usable (§16 I-17); each is optional.
	// Aiven powers Kafka back on when Aiven powered it off.
	Aiven *aiven.Client
	// Heartbeat sends a message so Kafka never sits idle for 24 hours.
	Heartbeat func(context.Context) error
	// Resend queues again, once, the work of items stuck in processing and
	// of compute requests still without a result, with the same request_id.
	Resend func(context.Context) (int, error)
}

// Jobs maps the job names (scheduler and cmd/jobs) to their functions.
func (s *Sweeper) Jobs() map[string]func(context.Context) error {
	return map[string]func(context.Context) error{
		"reaper":      s.Reaper,
		"tmp-cleanup": s.TmpCleanup,
		"retention":   s.Retention,
	}
}

// Reaper runs every 5 minutes:
//  1. powers Kafka back on if Aiven powered it off (I-17);
//  2. processing > 10 min -> failed (worker crash, flows/import.md §3);
//     awaiting_upload past ticket expiry -> deleted; compute requests
//     without a result after 10 min -> expired;
//  3. re-sends, once, items processing and compute requests pending for
//     over 4 minutes, keeping their request_id (I-17);
//  4. every 6 hours, a Kafka heartbeat (I-17);
//  5. wakes the services while work is pending, the backstop for a
//     missed wake (I-16).
//
// Only the database steps can fail the job; the rest log and carry on.
func (s *Sweeper) Reaper(ctx context.Context) error {
	s.ensureKafka(ctx)
	if err := s.reap(ctx); err != nil {
		return err
	}
	if s.Resend != nil {
		if _, err := s.Resend(ctx); err != nil {
			return err
		}
	}
	if s.Heartbeat != nil && HeartbeatDue(s.Now()) {
		if err := s.Heartbeat(ctx); err != nil {
			slog.Warn("kafka heartbeat failed", "step", "kafka.heartbeat", "error", err)
		} else {
			slog.Info("kafka heartbeat sent", "step", "kafka.heartbeat")
		}
	}
	return s.wakePending(ctx)
}

// HeartbeatDue is true in the first 5 minutes of every 6th UTC hour: one
// reaper run in each window, four heartbeats a day, well inside Aiven's
// 24-hour idle limit even if a run or two is missed.
func HeartbeatDue(now time.Time) bool {
	now = now.UTC()
	return now.Hour()%6 == 0 && now.Minute() < 5
}

func (s *Sweeper) ensureKafka(ctx context.Context) {
	if s.Aiven == nil {
		return
	}
	state, poweredOn, err := s.Aiven.EnsurePowered(ctx)
	switch {
	case err != nil:
		slog.Warn("could not check Kafka's power state", "step", "kafka.power", "error", err)
	case poweredOn:
		slog.Warn("Kafka was powered off; power-on requested", "step", "kafka.power")
	case state != "RUNNING":
		slog.Info("Kafka not running yet", "step", "kafka.power", "state", state)
	}
}

func (s *Sweeper) reap(ctx context.Context) error {
	return s.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		failed, err := tx.Exec(ctx, `UPDATE import_job SET status = 'failed', error_code = 'processing_error', completed_at = now()
			WHERE status = 'processing' AND processing_at < now() - interval '10 minutes'`)
		if err != nil {
			return err
		}
		stale, err := tx.Exec(ctx, `DELETE FROM import_job j WHERE status = 'awaiting_upload'
			AND created_at < now() - interval '10 minutes'
			AND NOT EXISTS (SELECT 1 FROM upload_ticket t WHERE t.target_id = j.id AND t.expires_at > now())`)
		if err != nil {
			return err
		}
		statements, err := tx.Exec(ctx, `UPDATE fin_statement SET mapping_status = 'failed', error_code = 'processing_error'
			WHERE mapping_status = 'processing' AND created_at < now() - interval '15 minutes'`)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM upload_ticket WHERE expires_at < now() - interval '1 day'`); err != nil {
			return err
		}
		compute, err := repository.ExpireComputeRequests(ctx, tx, 10*time.Minute)
		if err != nil {
			return err
		}
		slog.Info("reaper", "jobs_failed", failed.RowsAffected(), "jobs_expired", stale.RowsAffected(), "statements_failed", statements.RowsAffected(),
			"compute_expired", compute)
		return nil
	})
}

// wakePending wakes common when the outbox has unsent rows, common plus
// extract while an import or statement is processing, and common plus
// compute while a compute request is pending (its request or its result
// may be waiting in Kafka). A failed wake is logged, not fatal.
func (s *Sweeper) wakePending(ctx context.Context) error {
	if s.Wake == nil {
		return nil
	}
	var outbox, extract, compute bool
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		return tx.QueryRow(ctx, `SELECT
			EXISTS (SELECT 1 FROM outbox WHERE published_at IS NULL),
			EXISTS (SELECT 1 FROM import_job WHERE status = 'processing')
				OR EXISTS (SELECT 1 FROM fin_statement WHERE mapping_status = 'processing'),
			EXISTS (SELECT 1 FROM compute_request WHERE completed_at IS NULL)`).Scan(&outbox, &extract, &compute)
	})
	if err != nil {
		return err
	}
	if outbox || extract || compute {
		_ = s.Wake.Now(ctx, s.WakeURLs.Common, "pending work")
	}
	if extract {
		_ = s.Wake.Now(ctx, s.WakeURLs.Extract, "pending work")
	}
	if compute {
		_ = s.Wake.Now(ctx, s.WakeURLs.Compute, "pending work")
	}
	return nil
}

// TmpCleanup deletes uploads older than 1 hour from tmp/ (S-4) and
// claim-check payloads older than 1 day from compute/ (I-18). The bucket's
// 1-day lifecycle rules are the backstop. Every 15 minutes.
func (s *Sweeper) TmpCleanup(ctx context.Context) error {
	for _, sweep := range []struct {
		prefix string
		maxAge time.Duration
	}{{storage.TmpPrefix(s.Store), time.Hour}, {storage.ComputePrefix(s.Store), 24 * time.Hour}} {
		objects, err := s.Store.List(ctx, sweep.prefix)
		if err != nil {
			return err
		}
		cutoff := s.Now().Add(-sweep.maxAge)
		deleted := 0
		for _, o := range objects {
			if o.Created.Before(cutoff) {
				if err := s.Store.Delete(ctx, o.Key); err != nil {
					return fmt.Errorf("delete: %w", err)
				}
				deleted++
			}
		}
		slog.Info("storage cleanup", "prefix", sweep.prefix, "deleted", deleted, "kept", len(objects)-deleted)
	}
	return nil
}

// Retention: import jobs and staging 90 days after confirm or discard,
// published outbox rows after 7 days (E-5, data-model.md §4). Daily.
func (s *Sweeper) Retention(ctx context.Context) error {
	return s.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		jobs, err := tx.Exec(ctx, `DELETE FROM import_job WHERE (confirmed AND confirmed_at < now() - interval '90 days')
			OR (status IN ('completed', 'failed') AND NOT confirmed AND completed_at < now() - interval '90 days')`)
		if err != nil {
			return err
		}
		outbox, err := repository.PruneOutbox(ctx, tx, 7*24*time.Hour)
		if err != nil {
			return err
		}
		compute, err := repository.PruneComputeRequests(ctx, tx, 7*24*time.Hour)
		if err != nil {
			return err
		}
		slog.Info("retention", "import_jobs", jobs.RowsAffected(), "outbox_rows", outbox, "compute_requests", compute)
		return nil
	})
}
