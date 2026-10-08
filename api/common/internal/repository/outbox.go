package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

// Enqueue writes a message in the caller's transaction (§6.6): it is sent
// if and only if the business write commits.
func Enqueue(ctx context.Context, tx pgx.Tx, topic, key string, data any) error {
	_, err := tx.Exec(ctx, `INSERT INTO outbox (topic, message_key, payload) VALUES ($1, $2, $3)`, topic, key, mustJSON(data))
	return err
}

type OutboxRow struct {
	ID      int64
	Topic   string
	Key     string
	Payload json.RawMessage
}

// ClaimOutbox locks up to limit unsent rows; concurrent publishers skip
// each other's rows (SKIP LOCKED).
func ClaimOutbox(ctx context.Context, tx pgx.Tx, limit int) ([]OutboxRow, error) {
	rows, err := tx.Query(ctx, `SELECT id, topic, message_key, payload FROM outbox WHERE published_at IS NULL
		ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`, limit)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*OutboxRow, error) {
		var o OutboxRow
		return &o, r.Scan(&o.ID, &o.Topic, &o.Key, &o.Payload)
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

// UpsertRuleset stores a rule set and, when it changed and a topic is given,
// queues it on the compacted topic. Unsigned sets are published
// estimate_only (S-10).
func UpsertRuleset(ctx context.Context, tx pgx.Tx, r Ruleset, topic string) (changed bool, err error) {
	tag, err := tx.Exec(ctx, `INSERT INTO tax_ruleset (id, jurisdiction, tax_kind, effective_from, effective_to, signed_off, signed_off_by, rules)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET tax_kind = EXCLUDED.tax_kind, effective_from = EXCLUDED.effective_from,
			effective_to = EXCLUDED.effective_to, rules = EXCLUDED.rules, updated_at = now()
		WHERE (tax_ruleset.tax_kind, tax_ruleset.effective_from, tax_ruleset.effective_to, tax_ruleset.rules)
			IS DISTINCT FROM (EXCLUDED.tax_kind, EXCLUDED.effective_from, EXCLUDED.effective_to, EXCLUDED.rules)`,
		r.ID, r.Jurisdiction, r.TaxKind, r.EffectiveFrom, r.EffectiveTo, r.SignedOff, r.SignedOffBy, []byte(r.Rules))
	if err != nil || tag.RowsAffected() == 0 {
		return false, err
	}
	if topic == "" {
		return true, nil
	}
	// Sign-off is a legal event recorded in the table, never taken from seed
	// data: re-read the stored state before publishing.
	if err := tx.QueryRow(ctx, `SELECT signed_off, signed_off_by FROM tax_ruleset WHERE id = $1`, r.ID).Scan(&r.SignedOff, &r.SignedOffBy); err != nil {
		return false, err
	}
	r.EstimateOnly = !r.SignedOff
	return true, Enqueue(ctx, tx, topic, r.ID, r)
}

// RepublishRulesets queues every rule set again, e.g. after the topic was
// recreated (the topic rebuilds from Postgres: §5.3).
func RepublishRulesets(ctx context.Context, tx pgx.Tx, topic string) error {
	rows, err := tx.Query(ctx, `SELECT id, jurisdiction, tax_kind, to_char(effective_from, 'YYYY-MM-DD'),
		to_char(effective_to, 'YYYY-MM-DD'), signed_off, signed_off_by, rules FROM tax_ruleset`)
	if err != nil {
		return err
	}
	sets, err := collect(rows, func(row pgx.Row) (*Ruleset, error) {
		var r Ruleset
		err := row.Scan(&r.ID, &r.Jurisdiction, &r.TaxKind, &r.EffectiveFrom, &r.EffectiveTo, &r.SignedOff, &r.SignedOffBy, &r.Rules)
		r.EstimateOnly = !r.SignedOff
		return &r, err
	})
	if err != nil {
		return err
	}
	for _, r := range sets {
		if err := Enqueue(ctx, tx, topic, r.ID, r); err != nil {
			return err
		}
	}
	return nil
}
