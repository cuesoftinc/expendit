// Package sweep holds the scheduled jobs (system-design.md §6.7). Cloud
// Scheduler runs them as Cloud Run jobs from this image (cmd/jobs); all are
// lookup-then-write and safe to run twice.
package sweep

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/storage"
)

type Sweeper struct {
	DB    *repository.DB
	Store storage.Store
	Now   func() time.Time
}

// Jobs maps the cmd/jobs names to their functions.
func (s *Sweeper) Jobs() map[string]func(context.Context) error {
	return map[string]func(context.Context) error{
		"reaper":      s.Reaper,
		"tmp-cleanup": s.TmpCleanup,
		"retention":   s.Retention,
	}
}

// Reaper: processing > 10 min -> failed (worker crash, flows/import.md §3);
// awaiting_upload past ticket expiry -> deleted. Every minute.
func (s *Sweeper) Reaper(ctx context.Context) error {
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
		slog.Info("reaper", "jobs_failed", failed.RowsAffected(), "jobs_expired", stale.RowsAffected(), "statements_failed", statements.RowsAffected())
		return nil
	})
}

// TmpCleanup deletes uploads older than 1 hour from tmp/ (S-4). The bucket's
// 1-day lifecycle rule is the backstop. Every 15 minutes.
func (s *Sweeper) TmpCleanup(ctx context.Context) error {
	objects, err := s.Store.List(ctx, storage.TmpPrefix(s.Store))
	if err != nil {
		return err
	}
	cutoff := s.Now().Add(-time.Hour)
	deleted := 0
	for _, o := range objects {
		if o.Created.Before(cutoff) {
			if err := s.Store.Delete(ctx, o.Key); err != nil {
				return fmt.Errorf("delete: %w", err)
			}
			deleted++
		}
	}
	slog.Info("tmp cleanup", "deleted", deleted, "kept", len(objects)-deleted)
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
		slog.Info("retention", "import_jobs", jobs.RowsAffected(), "outbox_rows", outbox)
		return nil
	})
}
