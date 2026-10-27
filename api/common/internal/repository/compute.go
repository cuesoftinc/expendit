package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// ── Compute requests ────────────────────────────────────────────────────

// ClaimComputeRequest records a pending compute request. claimed is false
// when one is already pending for the same (org, kind, scope, data_version).
func ClaimComputeRequest(ctx context.Context, tx pgx.Tx, requestID, orgID, kind, scope string, dataVersion int64) (claimed bool, err error) {
	tag, err := tx.Exec(ctx, `INSERT INTO compute_request (request_id, org_id, kind, scope, data_version)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (org_id, kind, scope, data_version) WHERE completed_at IS NULL DO NOTHING`,
		requestID, orgID, kind, scope, dataVersion)
	return tag.RowsAffected() == 1, err
}

func SetComputeOutbox(ctx context.Context, tx pgx.Tx, requestID string, outboxID int64) error {
	_, err := tx.Exec(ctx, `UPDATE compute_request SET outbox_id = $2 WHERE request_id = $1`, requestID, outboxID)
	return err
}

// FirstComputeResult records a result and reports whether it is the first
// for its request_id. A request_id with no row counts as first.
func FirstComputeResult(ctx context.Context, tx pgx.Tx, requestID, status string) (bool, error) {
	var seen bool
	err := tx.QueryRow(ctx, `SELECT result_at IS NOT NULL FROM compute_request WHERE request_id = $1 FOR UPDATE`, requestID).Scan(&seen)
	if errors.Is(err, pgx.ErrNoRows) {
		return true, nil
	}
	if err != nil || seen {
		return false, err
	}
	if status != "ok" {
		status = "failed"
	}
	_, err = tx.Exec(ctx, `UPDATE compute_request SET result_at = now(), completed_at = coalesce(completed_at, now()), status = $2
		WHERE request_id = $1`, requestID, status)
	return err == nil, err
}

// FailComputeRequest ends a pending request whose result could not be
// stored, so the next read queues a fresh one.
func FailComputeRequest(ctx context.Context, tx pgx.Tx, requestID string) error {
	_, err := tx.Exec(ctx, `UPDATE compute_request SET completed_at = now(), status = 'failed'
		WHERE request_id = $1 AND completed_at IS NULL`, requestID)
	return err
}

type OverdueCompute struct {
	RequestID string
	OrgID     string
	Kind      string
	OutboxID  int64
}

// ListOverdueCompute locks pending requests sent more than `after` ago and
// not yet re-sent.
func ListOverdueCompute(ctx context.Context, tx pgx.Tx, after time.Duration) ([]OverdueCompute, error) {
	rows, err := tx.Query(ctx, `SELECT request_id::text, org_id::text, kind, outbox_id FROM compute_request
		WHERE completed_at IS NULL AND resent_at IS NULL AND outbox_id IS NOT NULL
		  AND requested_at < now() - make_interval(secs => $1)
		ORDER BY requested_at FOR UPDATE SKIP LOCKED`, after.Seconds())
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*OverdueCompute, error) {
		var o OverdueCompute
		return &o, r.Scan(&o.RequestID, &o.OrgID, &o.Kind, &o.OutboxID)
	})
}

// MarkComputeResent records the single re-send.
func MarkComputeResent(ctx context.Context, tx pgx.Tx, requestID string) error {
	_, err := tx.Exec(ctx, `UPDATE compute_request SET resent_at = now() WHERE request_id = $1`, requestID)
	return err
}

// ExpireComputeRequests ends requests still without a result after
// `after`; a late result still counts as the first.
func ExpireComputeRequests(ctx context.Context, tx pgx.Tx, after time.Duration) (int64, error) {
	tag, err := tx.Exec(ctx, `UPDATE compute_request SET completed_at = now(), status = 'expired'
		WHERE completed_at IS NULL AND requested_at < now() - make_interval(secs => $1)`, after.Seconds())
	return tag.RowsAffected(), err
}

func PruneComputeRequests(ctx context.Context, tx pgx.Tx, olderThan time.Duration) (int64, error) {
	tag, err := tx.Exec(ctx, `DELETE FROM compute_request WHERE completed_at < now() - make_interval(secs => $1)`, olderThan.Seconds())
	return tag.RowsAffected(), err
}

// RequestID returns an import job's or statement's request id, assigning
// one on first use so a re-send keeps it.
func RequestID(ctx context.Context, tx pgx.Tx, kind, id string) (string, error) {
	table := "import_job"
	if kind == "fin_statement" {
		table = "fin_statement"
	}
	var requestID string
	err := tx.QueryRow(ctx, `UPDATE `+table+` SET request_id = coalesce(request_id, gen_random_uuid())
		WHERE id = $1 RETURNING request_id::text`, id).Scan(&requestID)
	return requestID, translate(err)
}
