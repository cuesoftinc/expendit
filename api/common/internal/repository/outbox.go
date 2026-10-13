package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

// Enqueue writes an event in the caller's transaction (§6.6): it is sent
// if and only if the business write commits.
func Enqueue(ctx context.Context, tx pgx.Tx, event, key string, data any) error {
	_, err := tx.Exec(ctx, `INSERT INTO outbox (event, message_key, payload) VALUES ($1, $2, $3)`, event, key, mustJSON(data))
	return err
}

type OutboxRow struct {
	ID      int64
	Event   string
	Key     string
	Payload json.RawMessage
}

// ClaimOutbox locks up to limit unsent rows; concurrent publishers skip
// each other's rows (SKIP LOCKED).
func ClaimOutbox(ctx context.Context, tx pgx.Tx, limit int) ([]OutboxRow, error) {
	rows, err := tx.Query(ctx, `SELECT id, event, message_key, payload FROM outbox WHERE published_at IS NULL
		ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`, limit)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*OutboxRow, error) {
		var o OutboxRow
		return &o, r.Scan(&o.ID, &o.Event, &o.Key, &o.Payload)
	})
}

func MarkPublished(ctx context.Context, tx pgx.Tx, ids []int64) error {
	_, err := tx.Exec(ctx, `UPDATE outbox SET published_at = now() WHERE id = ANY($1)`, ids)
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
