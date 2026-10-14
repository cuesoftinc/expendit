package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

// ResendAfter is how long an item may stay processing before its message is
// queued again. Results normally come back in seconds; the reaper fails
// what is still processing at 10 minutes (flows/import.md §3).
const ResendAfter = 4 * time.Minute

// ResendStuck queues import.ready / statement.ready again, once, for every
// import job and statement still processing after ResendAfter
// (system-design.md §16 I-17). Postgres is the source of truth and Kafka
// only carries hand-offs, so a message lost in Kafka (the shared Aiven Kafka
// drops topic data when it powers off) is rebuilt from the stored upload.
// A duplicate is harmless: a result for an item no longer processing is
// dropped.
func ResendStuck(ctx context.Context, db *repository.DB, imports *Imports, statements *Statements) (int, error) {
	var stuck []repository.StuckItem
	if err := db.AsSystem(ctx, func(tx pgx.Tx) (err error) {
		stuck, err = repository.ListStuck(ctx, tx, ResendAfter)
		return err
	}); err != nil {
		return 0, err
	}
	resent := 0
	for _, item := range stuck {
		err := db.AsSystem(ctx, func(tx pgx.Tx) error {
			if err := repository.Narrow(ctx, tx, item.OrgID); err != nil {
				return err
			}
			var msg uploadReceived
			if err := json.Unmarshal(item.Upload, &msg); err != nil {
				return err
			}
			if item.Kind == "fin_statement" {
				st, err := repository.GetStatement(ctx, tx, item.ID, true)
				if err != nil || st.MappingStatus != "processing" {
					return err
				}
				if err := statements.enqueueReady(ctx, tx, st, msg); err != nil {
					return err
				}
			} else {
				job, err := repository.LockImportJob(ctx, tx, item.ID)
				if err != nil || job.Status != "processing" {
					return err
				}
				if err := imports.enqueueReady(ctx, tx, job, msg); err != nil {
					return err
				}
			}
			return repository.MarkResent(ctx, tx, item.Kind, item.ID)
		})
		if err != nil {
			slog.Error("re-send failed", "step", "resend", "target", item.Kind, "target_id", item.ID, "error", err)
			continue
		}
		resent++
		slog.Info("re-sent from Postgres: no result after the first send", "step", "resend",
			"target", item.Kind, "target_id", item.ID, "org_id", item.OrgID)
	}
	return resent, nil
}
