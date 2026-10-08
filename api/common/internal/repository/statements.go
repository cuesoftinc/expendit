package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

type Statement struct {
	ID              string     `json:"id"`
	OrgID           string     `json:"org_id"`
	Kind            string     `json:"kind"`
	Period          string     `json:"period"`
	Currency        string     `json:"currency"`
	SourceFileType  string     `json:"source_file_type"`
	MappingStatus   string     `json:"mapping_status"`
	SupersededBy    *string    `json:"superseded_by"`
	MappingWarnings []string   `json:"mapping_warnings"`
	CreatedAt       time.Time  `json:"created_at"`
	ConfirmedAt     *time.Time `json:"confirmed_at"`

	MappingVersion int              `json:"-"`
	Validation     *json.RawMessage `json:"-"`
	ErrorCode      *string          `json:"-"`
	ObjectKey      *string          `json:"-"`
	CreatedBy      *string          `json:"-"`
}

type Validation struct {
	OK             bool     `json:"ok"`
	Codes          []string `json:"codes"`
	MappingVersion int      `json:"mapping_version"`
	Warnings       []string `json:"warnings"`
}

const statementCols = `id, org_id, kind, period, currency, source_file_type, mapping_status, superseded_by, created_at,
	confirmed_at, mapping_version, validation, error_code, object_key, created_by`

func scanStatement(row pgx.Row) (*Statement, error) {
	var s Statement
	var validation []byte
	if err := row.Scan(&s.ID, &s.OrgID, &s.Kind, &s.Period, &s.Currency, &s.SourceFileType, &s.MappingStatus, &s.SupersededBy,
		&s.CreatedAt, &s.ConfirmedAt, &s.MappingVersion, &validation, &s.ErrorCode, &s.ObjectKey, &s.CreatedBy); err != nil {
		return nil, translate(err)
	}
	s.MappingWarnings = []string{}
	if len(validation) > 0 {
		raw := json.RawMessage(validation)
		s.Validation = &raw
		var v Validation
		if json.Unmarshal(validation, &v) == nil && v.Warnings != nil {
			s.MappingWarnings = v.Warnings
		}
	}
	return &s, nil
}

func CreateStatement(ctx context.Context, tx pgx.Tx, s Statement, idemKey *string) (*Statement, bool, error) {
	if idemKey != nil {
		existing, err := scanStatement(tx.QueryRow(ctx, `SELECT `+statementCols+` FROM fin_statement
			WHERE org_id = $1 AND idempotency_key = $2 AND mapping_status <> 'failed'`, s.OrgID, *idemKey))
		if err == nil {
			return existing, true, nil
		} else if err != ErrNotFound {
			return nil, false, err
		}
	}
	out, err := scanStatement(tx.QueryRow(ctx, `INSERT INTO fin_statement (org_id, created_by, kind, period, currency,
		source_file_type, mapping_status, idempotency_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING `+statementCols,
		s.OrgID, s.CreatedBy, s.Kind, s.Period, s.Currency, s.SourceFileType, s.MappingStatus, idemKey))
	return out, false, err
}

func GetStatement(ctx context.Context, tx pgx.Tx, id string, lock bool) (*Statement, error) {
	q := `SELECT ` + statementCols + ` FROM fin_statement WHERE id = $1`
	if lock {
		q += ` FOR UPDATE`
	}
	return scanStatement(tx.QueryRow(ctx, q, id))
}

func ListStatements(ctx context.Context, tx pgx.Tx) ([]Statement, error) {
	rows, err := tx.Query(ctx, `SELECT `+statementCols+` FROM fin_statement WHERE mapping_status <> 'awaiting_upload'
		ORDER BY period DESC, kind, created_at DESC`)
	if err != nil {
		return nil, err
	}
	return collect(rows, scanStatement)
}

func SetStatementStatus(ctx context.Context, tx pgx.Tx, id, status string, errorCode *string, objectKey *string) error {
	_, err := tx.Exec(ctx, `UPDATE fin_statement SET mapping_status = $2, error_code = $3, object_key = coalesce($4, object_key)
		WHERE id = $1`, id, status, errorCode, objectKey)
	return err
}

// BumpMapping increments mapping_version and clears the stored validation
// (§6.4: confirm waits for the recomputation).
func BumpMapping(ctx context.Context, tx pgx.Tx, id string) (int, error) {
	var v int
	err := tx.QueryRow(ctx, `UPDATE fin_statement SET mapping_version = mapping_version + 1, validation = NULL
		WHERE id = $1 RETURNING mapping_version`, id).Scan(&v)
	return v, err
}

// StoreValidation keeps a validation only if it is for the current mapping.
func StoreValidation(ctx context.Context, tx pgx.Tx, id string, v json.RawMessage, version int) error {
	_, err := tx.Exec(ctx, `UPDATE fin_statement SET validation = $2 WHERE id = $1 AND mapping_version = $3`, id, []byte(v), version)
	return err
}

func ConfirmStatement(ctx context.Context, tx pgx.Tx, s *Statement) error {
	// A newer confirmed statement for the same org, kind and period
	// supersedes the old one (audit trail, flows/statement-mapping.md §4).
	if _, err := tx.Exec(ctx, `UPDATE fin_statement SET mapping_status = 'superseded', superseded_by = $1
		WHERE org_id = $2 AND kind = $3 AND period = $4 AND mapping_status = 'confirmed' AND id <> $1`,
		s.ID, s.OrgID, s.Kind, s.Period); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `UPDATE fin_statement SET mapping_status = 'confirmed', confirmed_at = now() WHERE id = $1`, s.ID)
	return err
}

type LineItem struct {
	ID           string   `json:"id"`
	StatementID  string   `json:"statement_id"`
	CanonicalKey *string  `json:"canonical_key"`
	SourceLabel  string   `json:"source_label"`
	Amount       float64  `json:"amount"`
	Status       string   `json:"status"`
	Confidence   *float64 `json:"confidence"`
	MappedBy     string   `json:"mapped_by"`
	Derived      bool     `json:"derived"`
}

const lineItemCols = `id, statement_id, canonical_key, source_label, amount, status, confidence, mapped_by, derived`

func scanLineItem(row pgx.Row) (*LineItem, error) {
	var l LineItem
	var confidence *float32
	if err := row.Scan(&l.ID, &l.StatementID, &l.CanonicalKey, &l.SourceLabel, &l.Amount, &l.Status, &confidence, &l.MappedBy, &l.Derived); err != nil {
		return nil, translate(err)
	}
	if confidence != nil {
		c := float64(*confidence)
		l.Confidence = &c
	}
	return &l, nil
}

func ListLineItems(ctx context.Context, tx pgx.Tx, statementID string) ([]LineItem, error) {
	rows, err := tx.Query(ctx, `SELECT `+lineItemCols+` FROM line_item WHERE statement_id = $1 ORDER BY position`, statementID)
	if err != nil {
		return nil, err
	}
	return collect(rows, scanLineItem)
}

func InsertLineItem(ctx context.Context, tx pgx.Tx, orgID, statementID string, l LineItem) error {
	_, err := tx.Exec(ctx, `INSERT INTO line_item (statement_id, org_id, position, canonical_key, source_label, amount, status, confidence, mapped_by, derived)
		VALUES ($1, $2, (SELECT coalesce(max(position), -1) + 1 FROM line_item WHERE statement_id = $1), $3, $4, $5, $6, $7, $8, $9)`,
		statementID, orgID, l.CanonicalKey, l.SourceLabel, l.Amount, l.Status, l.Confidence, l.MappedBy, l.Derived)
	return err
}

func SetLineItemKey(ctx context.Context, tx pgx.Tx, statementID, id string, key *string) error {
	status := "unmapped"
	if key != nil {
		status = "mapped"
	}
	tag, err := tx.Exec(ctx, `UPDATE line_item SET canonical_key = $3, status = $4, mapped_by = 'user', confidence = NULL
		WHERE statement_id = $1 AND id = $2 AND NOT derived`, statementID, id, key, status)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

// ReplaceDerived swaps the derived rows for the latest computation's.
func ReplaceDerived(ctx context.Context, tx pgx.Tx, orgID, statementID string, derived []LineItem) error {
	if _, err := tx.Exec(ctx, `DELETE FROM line_item WHERE statement_id = $1 AND derived`, statementID); err != nil {
		return err
	}
	for _, d := range derived {
		d.Derived, d.Status, d.MappedBy = true, "mapped", "ai"
		if err := InsertLineItem(ctx, tx, orgID, statementID, d); err != nil {
			return err
		}
	}
	return nil
}

func SetStatementCurrency(ctx context.Context, tx pgx.Tx, id, currency string) error {
	_, err := tx.Exec(ctx, `UPDATE fin_statement SET currency = $2 WHERE id = $1`, id, currency)
	return err
}

// ── Compute inputs (lookups only) ───────────────────────────────────────

type KeyValue struct {
	ID     string  `json:"id"`
	Amount float64 `json:"amount"`
}

type PeriodValues struct {
	Period string              `json:"period"`
	Kinds  []string            `json:"kinds"`
	Values map[string]KeyValue `json:"values"`
}

// ConfirmedValues collects mapped line items of every confirmed statement
// for the period. Nil when the period has none.
func ConfirmedValues(ctx context.Context, tx pgx.Tx, period string) (*PeriodValues, error) {
	rows, err := tx.Query(ctx, `SELECT s.kind, l.canonical_key, l.id, l.amount::float8 FROM fin_statement s
		JOIN line_item l ON l.statement_id = s.id
		WHERE s.period = $1 AND s.mapping_status = 'confirmed' AND l.status = 'mapped' AND l.canonical_key IS NOT NULL`, period)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	pv := &PeriodValues{Period: period, Kinds: []string{}, Values: map[string]KeyValue{}}
	kinds := map[string]bool{}
	for rows.Next() {
		var kind, key string
		var kv KeyValue
		if err := rows.Scan(&kind, &key, &kv.ID, &kv.Amount); err != nil {
			return nil, err
		}
		if !kinds[kind] {
			kinds[kind] = true
			pv.Kinds = append(pv.Kinds, kind)
		}
		pv.Values[key] = kv
	}
	if len(pv.Kinds) == 0 {
		return nil, rows.Err()
	}
	return pv, rows.Err()
}

func ConfirmedCashFlowPeriods(ctx context.Context, tx pgx.Tx) (int, error) {
	var n int
	err := tx.QueryRow(ctx, `SELECT count(DISTINCT period) FROM fin_statement WHERE kind = 'cash_flow' AND mapping_status = 'confirmed'`).Scan(&n)
	return n, err
}

// LedgerMonthlyNets: income minus expense for each of the trailing 3
// complete months that has any transaction (line-items.md §5 runway).
func LedgerMonthlyNets(ctx context.Context, tx pgx.Tx) ([]float64, error) {
	rows, err := tx.Query(ctx, `SELECT sum(CASE WHEN direction = 'income' THEN amount ELSE -amount END)::float8 FROM ledger_txn
		WHERE txn_date >= date_trunc('month', now()) - interval '3 months' AND txn_date < date_trunc('month', now())
		GROUP BY date_trunc('month', txn_date) ORDER BY date_trunc('month', txn_date)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	nets := []float64{}
	for rows.Next() {
		var n float64
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		nets = append(nets, n)
	}
	return nets, rows.Err()
}
