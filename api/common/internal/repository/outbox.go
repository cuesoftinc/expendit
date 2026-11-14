package repository

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
)

type queuedKey struct{}

// Queued counts the outbox rows a request queued; the server publishes them
// before it answers.
type Queued struct{ n atomic.Int64 }

func (q *Queued) Any() bool { return q.n.Load() > 0 }

// WithQueued returns a context whose Enqueue calls count on the Queued.
func WithQueued(ctx context.Context) (context.Context, *Queued) {
	q := &Queued{}
	return context.WithValue(ctx, queuedKey{}, q), q
}

// NoteQueued counts one queued row against ctx's Queued, if it has one.
func NoteQueued(ctx context.Context) {
	if q, ok := ctx.Value(queuedKey{}).(*Queued); ok {
		q.n.Add(1)
	}
}

// Enqueue writes an event in the caller's transaction (§6.6): it is sent
// if and only if the business write commits. requestID rides in the
// envelope; empty sends none. Returns the outbox row id.
func Enqueue(ctx context.Context, tx pgx.Tx, event, key, requestID string, data any) (int64, error) {
	NoteQueued(ctx)
	var id int64
	err := tx.QueryRow(ctx, `INSERT INTO outbox (event, message_key, request_id, payload)
		VALUES ($1, $2, nullif($3, '')::uuid, $4) RETURNING id`, event, key, requestID, mustJSON(data)).Scan(&id)
	return id, err
}

// Requeue queues a published outbox row again as a new message with the
// same request_id. ok is false when the row is gone or not yet published.
func Requeue(ctx context.Context, tx pgx.Tx, id int64) (newID int64, ok bool, err error) {
	err = tx.QueryRow(ctx, `INSERT INTO outbox (event, message_key, request_id, payload)
		SELECT event, message_key, request_id, payload FROM outbox WHERE id = $1 AND published_at IS NOT NULL
		RETURNING id`, id).Scan(&newID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	return newID, err == nil, err
}

type OutboxRow struct {
	ID        int64
	Event     string
	Key       string
	RequestID string
	Payload   json.RawMessage
	CreatedAt time.Time
}

// LeaseOutbox takes up to limit unsent rows whose lease is free or lapsed and
// leases them to owner for `lease`; concurrent publishers skip each other's
// rows (SKIP LOCKED) and the statement holds no lock after it returns.
func LeaseOutbox(ctx context.Context, tx pgx.Tx, limit int, lease time.Duration, owner string) ([]OutboxRow, error) {
	rows, err := tx.Query(ctx, `UPDATE outbox SET lease_until = now() + make_interval(secs => $2), lease_owner = $3
		WHERE id IN (SELECT id FROM outbox WHERE published_at IS NULL AND (lease_until IS NULL OR lease_until < now())
			ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED)
		RETURNING id, event, message_key, coalesce(request_id::text, ''), payload, created_at`, limit, lease.Seconds(), owner)
	if err != nil {
		return nil, err
	}
	out, err := collect(rows, func(r pgx.Row) (*OutboxRow, error) {
		var o OutboxRow
		return &o, r.Scan(&o.ID, &o.Event, &o.Key, &o.RequestID, &o.Payload, &o.CreatedAt)
	})
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, err
}

// ReleaseOutbox frees owner's lease on rows that were not sent, so the next
// pass retries them in order. Rows another pass has leased since are left alone.
func ReleaseOutbox(ctx context.Context, tx pgx.Tx, ids []int64, owner string) error {
	_, err := tx.Exec(ctx, `UPDATE outbox SET lease_until = NULL, lease_owner = NULL
		WHERE id = ANY($1) AND published_at IS NULL AND lease_owner = $2`, ids, owner)
	return err
}

// MarkPublished marks owner's rows sent; a row another pass leased after
// owner's lease lapsed is left to that pass.
func MarkPublished(ctx context.Context, tx pgx.Tx, ids []int64, owner string) error {
	_, err := tx.Exec(ctx, `UPDATE outbox SET published_at = now(), lease_until = NULL, lease_owner = NULL
		WHERE id = ANY($1) AND lease_owner = $2`, ids, owner)
	return err
}

func PruneOutbox(ctx context.Context, tx pgx.Tx, olderThan time.Duration) (int64, error) {
	tag, err := tx.Exec(ctx, `DELETE FROM outbox WHERE published_at < now() - make_interval(secs => $1)`, olderThan.Seconds())
	return tag.RowsAffected(), err
}

// ── Rule sets ───────────────────────────────────────────────────────────

type Ruleset struct {
	ID            string          `json:"ruleset_id"`
	Jurisdiction  string          `json:"jurisdiction"`
	TaxKind       string          `json:"tax_kind"`
	EffectiveFrom string          `json:"effective_from"`
	EffectiveTo   *string         `json:"effective_to"`
	SignedOff     bool            `json:"signed_off"`
	SignedOffBy   *string         `json:"signed_off_by"`
	EstimateOnly  bool            `json:"estimate_only"`
	Rules         json.RawMessage `json:"rules"`
}

// UpsertRuleset stores a rule set and reports whether it changed. Sign-off
// is a legal event recorded in the table, never taken from seed data, so it
// is not part of the update.
func UpsertRuleset(ctx context.Context, tx pgx.Tx, r Ruleset) (changed bool, err error) {
	tag, err := tx.Exec(ctx, `INSERT INTO tax_ruleset (id, jurisdiction, tax_kind, effective_from, effective_to, signed_off, signed_off_by, rules)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET tax_kind = EXCLUDED.tax_kind, effective_from = EXCLUDED.effective_from,
			effective_to = EXCLUDED.effective_to, rules = EXCLUDED.rules, updated_at = now()
		WHERE (tax_ruleset.tax_kind, tax_ruleset.effective_from, tax_ruleset.effective_to, tax_ruleset.rules)
			IS DISTINCT FROM (EXCLUDED.tax_kind, EXCLUDED.effective_from, EXCLUDED.effective_to, EXCLUDED.rules)`,
		r.ID, r.Jurisdiction, r.TaxKind, r.EffectiveFrom, r.EffectiveTo, r.SignedOff, r.SignedOffBy, []byte(r.Rules))
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// ListRulesets returns every stored rule set as analytics reads it: compute
// requests for tax carry them (S-10), so a sign-off applies to the next
// request. Unsigned sets go out estimate_only.
func ListRulesets(ctx context.Context, tx pgx.Tx) ([]Ruleset, error) {
	rows, err := tx.Query(ctx, `SELECT id, jurisdiction, tax_kind, to_char(effective_from, 'YYYY-MM-DD'),
		to_char(effective_to, 'YYYY-MM-DD'), signed_off, signed_off_by, rules FROM tax_ruleset ORDER BY id`)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(row pgx.Row) (*Ruleset, error) {
		var r Ruleset
		err := row.Scan(&r.ID, &r.Jurisdiction, &r.TaxKind, &r.EffectiveFrom, &r.EffectiveTo, &r.SignedOff, &r.SignedOffBy, &r.Rules)
		r.EstimateOnly = !r.SignedOff
		return &r, err
	})
}
