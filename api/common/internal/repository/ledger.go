package repository

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/model"
)

// ── Categories ──────────────────────────────────────────────────────────

const categoryCols = `c.id, c.org_id, c.name, c.type, c.color, c.tax_treatment, c.vat_treatment, c.vat_basis, c.ai_proposed, c.ai_note, c.archived_at`

func scanCategory(row pgx.Row) (*model.Category, error) {
	var c model.Category
	if err := row.Scan(&c.ID, &c.OrgID, &c.Name, &c.Type, &c.Color, &c.TaxTreatment, &c.VATTreatment, &c.VATBasis,
		&c.AIProposed, &c.AINote, &c.ArchivedAt); err != nil {
		return nil, translate(err)
	}
	return &c, nil
}

func ListCategories(ctx context.Context, tx pgx.Tx, archived bool) ([]model.Category, error) {
	rows, err := tx.Query(ctx, `SELECT `+categoryCols+`,
		(SELECT count(*) FROM ledger_txn t WHERE t.category_id = c.id AND t.txn_date >= date_trunc('year', now())) AS ytd
		FROM category c WHERE (c.archived_at IS NOT NULL) = $1 ORDER BY c.type, lower(c.name)`, archived)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*model.Category, error) {
		var c model.Category
		err := r.Scan(&c.ID, &c.OrgID, &c.Name, &c.Type, &c.Color, &c.TaxTreatment, &c.VATTreatment, &c.VATBasis,
			&c.AIProposed, &c.AINote, &c.ArchivedAt, &c.TxnCountYTD)
		return &c, err
	})
}

func GetCategory(ctx context.Context, tx pgx.Tx, id string) (*model.Category, error) {
	return scanCategory(tx.QueryRow(ctx, `SELECT `+categoryCols+` FROM category c WHERE c.id = $1`, id))
}

func CreateCategory(ctx context.Context, tx pgx.Tx, c model.Category) (*model.Category, error) {
	return scanCategory(tx.QueryRow(ctx, `INSERT INTO category AS c (org_id, name, type, color, tax_treatment, vat_treatment, vat_basis, ai_proposed, ai_note)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING `+categoryCols,
		c.OrgID, c.Name, c.Type, c.Color, c.TaxTreatment, c.VATTreatment, c.VATBasis, c.AIProposed, c.AINote))
}

func UpdateCategory(ctx context.Context, tx pgx.Tx, c model.Category) (*model.Category, error) {
	return scanCategory(tx.QueryRow(ctx, `UPDATE category AS c SET name = $2, type = $3, color = $4, tax_treatment = $5,
		vat_treatment = $6, vat_basis = $7, ai_proposed = $8, ai_note = $9 WHERE c.id = $1 RETURNING `+categoryCols,
		c.ID, c.Name, c.Type, c.Color, c.TaxTreatment, c.VATTreatment, c.VATBasis, c.AIProposed, c.AINote))
}

func SetCategoryArchived(ctx context.Context, tx pgx.Tx, id string, archived bool) (*model.Category, error) {
	return scanCategory(tx.QueryRow(ctx, `UPDATE category AS c SET archived_at = CASE WHEN $2 THEN now() END
		WHERE c.id = $1 RETURNING `+categoryCols, id, archived))
}

func CategoryInUse(ctx context.Context, tx pgx.Tx, id string) (bool, error) {
	var used bool
	err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM ledger_txn WHERE category_id = $1)
		OR EXISTS (SELECT 1 FROM staged_txn WHERE category_id = $1)`, id).Scan(&used)
	return used, err
}

func DeleteCategory(ctx context.Context, tx pgx.Tx, id string) error {
	tag, err := tx.Exec(ctx, `DELETE FROM category WHERE id = $1`, id)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

// MergeCategory moves every ledger and staged row to into, then deletes id.
func MergeCategory(ctx context.Context, tx pgx.Tx, id, into string) (int64, error) {
	tag, err := tx.Exec(ctx, `UPDATE ledger_txn SET category_id = $2 WHERE category_id = $1`, id, into)
	if err != nil {
		return 0, err
	}
	if _, err := tx.Exec(ctx, `UPDATE staged_txn SET category_id = $2 WHERE category_id = $1`, id, into); err != nil {
		return 0, err
	}
	return tag.RowsAffected(), DeleteCategory(ctx, tx, id)
}

// EnsureCategory returns the id of the named category, creating it (AI
// proposed) when analytics named one the org doesn't have yet.
func EnsureCategory(ctx context.Context, tx pgx.Tx, orgID, name, typ string) (string, error) {
	var id string
	err := tx.QueryRow(ctx, `INSERT INTO category (org_id, name, type, ai_proposed, ai_note)
		VALUES ($1, $2, $3, true, 'AI proposed during import')
		ON CONFLICT (org_id, type, lower(name)) DO UPDATE SET name = category.name RETURNING id`, orgID, name, typ).Scan(&id)
	return id, translate(err)
}

// ── Ledger transactions ─────────────────────────────────────────────────

const txnCols = `id, org_id, description, amount, direction, category_id, to_char(txn_date, 'YYYY-MM-DD'), source,
	source_link_id, ai_categorized, excluded_from_reports, anomalies, created_at`

func scanTxn(row pgx.Row) (*model.Txn, error) {
	var t model.Txn
	var anomalies []byte
	if err := row.Scan(&t.ID, &t.OrgID, &t.Description, &t.Amount, &t.Direction, &t.CategoryID, &t.TxnDate, &t.Source,
		&t.SourceLinkID, &t.AICategorized, &t.ExcludedFromReports, &anomalies, &t.CreatedAt); err != nil {
		return nil, translate(err)
	}
	t.Anomalies = []model.Anomaly{}
	return &t, json.Unmarshal(anomalies, &t.Anomalies)
}

type TxnFilter struct {
	DateFrom, DateTo, CategoryID, Source, Direction, Search string
	AmountMin, AmountMax                                    *float64
	AnomalyOnly                                             bool
	Cursor                                                  string
	Limit                                                   int
}

// ListTxns pages newest first with an opaque (txn_date, id) keyset cursor.
func ListTxns(ctx context.Context, tx pgx.Tx, f TxnFilter) (model.Page[model.Txn], error) {
	where := []string{"true"}
	args := []any{}
	add := func(cond string, v any) {
		args = append(args, v)
		where = append(where, fmt.Sprintf(cond, len(args)))
	}
	if f.DateFrom != "" {
		add("txn_date >= $%d::date", f.DateFrom)
	}
	if f.DateTo != "" {
		add("txn_date <= $%d::date", f.DateTo)
	}
	if f.CategoryID != "" {
		add("category_id = $%d", f.CategoryID)
	}
	if f.Source != "" {
		add("source = $%d", f.Source)
	}
	if f.Direction != "" {
		add("direction = $%d", f.Direction)
	}
	if f.AmountMin != nil {
		add("amount >= $%d", *f.AmountMin)
	}
	if f.AmountMax != nil {
		add("amount <= $%d", *f.AmountMax)
	}
	if f.AnomalyOnly {
		where = append(where, "jsonb_array_length(anomalies) > 0")
	}
	if f.Search != "" {
		add("description ILIKE '%%' || $%d || '%%'", f.Search)
	}
	if date, id, ok := decodeCursor(f.Cursor); ok {
		args = append(args, date, id)
		where = append(where, fmt.Sprintf("(txn_date, id) < ($%d::date, $%d::uuid)", len(args)-1, len(args)))
	}
	limit := f.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	args = append(args, limit+1)
	rows, err := tx.Query(ctx, `SELECT `+txnCols+` FROM ledger_txn WHERE `+strings.Join(where, " AND ")+
		fmt.Sprintf(` ORDER BY txn_date DESC, id DESC LIMIT $%d`, len(args)), args...)
	if err != nil {
		return model.Page[model.Txn]{}, err
	}
	items, err := collect(rows, scanTxn)
	if err != nil {
		return model.Page[model.Txn]{}, err
	}
	page := model.Page[model.Txn]{Items: items}
	if len(items) > limit {
		page.Items = items[:limit]
		last := page.Items[limit-1]
		cursor := encodeCursor(last.TxnDate, last.ID)
		page.NextCursor = &cursor
	}
	return page, nil
}

func encodeCursor(date, id string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(date + "|" + id))
}

func decodeCursor(c string) (string, string, bool) {
	raw, err := base64.RawURLEncoding.DecodeString(c)
	if err != nil {
		return "", "", false
	}
	date, id, ok := strings.Cut(string(raw), "|")
	if _, perr := time.Parse("2006-01-02", date); !ok || perr != nil {
		return "", "", false
	}
	return date, id, true
}

func GetTxn(ctx context.Context, tx pgx.Tx, id string) (*model.Txn, error) {
	return scanTxn(tx.QueryRow(ctx, `SELECT `+txnCols+` FROM ledger_txn WHERE id = $1`, id))
}

func CreateTxn(ctx context.Context, tx pgx.Tx, t model.Txn) (*model.Txn, error) {
	return scanTxn(tx.QueryRow(ctx, `INSERT INTO ledger_txn (org_id, description, amount, direction, category_id, txn_date, source)
		VALUES ($1, $2, $3, $4, $5, $6, 'manual') RETURNING `+txnCols,
		t.OrgID, t.Description, t.Amount, t.Direction, t.CategoryID, t.TxnDate))
}

func UpdateTxn(ctx context.Context, tx pgx.Tx, t model.Txn) (*model.Txn, error) {
	return scanTxn(tx.QueryRow(ctx, `UPDATE ledger_txn SET description = $2, amount = $3, direction = $4, category_id = $5,
		txn_date = $6, excluded_from_reports = $7, anomalies = $8, ai_categorized = $9 WHERE id = $1 RETURNING `+txnCols,
		t.ID, t.Description, t.Amount, t.Direction, t.CategoryID, t.TxnDate, t.ExcludedFromReports, mustJSON(t.Anomalies), t.AICategorized))
}

func DeleteTxn(ctx context.Context, tx pgx.Tx, id string) error {
	tag, err := tx.Exec(ctx, `DELETE FROM ledger_txn WHERE id = $1`, id)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

// ── Aggregates (plain sums; every decision is analytics') ──────────────

type MonthFlow struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

func MonthlyFlows(ctx context.Context, tx pgx.Tx, months int) ([]MonthFlow, error) {
	rows, err := tx.Query(ctx, `SELECT to_char(m, 'YYYY-MM'),
			coalesce(sum(t.amount) FILTER (WHERE t.direction = 'income'), 0)::float8,
			coalesce(sum(t.amount) FILTER (WHERE t.direction = 'expense'), 0)::float8
		FROM generate_series(date_trunc('month', now()) - make_interval(months => $1 - 1), date_trunc('month', now()), interval '1 month') m
		LEFT JOIN ledger_txn t ON date_trunc('month', t.txn_date) = m AND NOT t.excluded_from_reports
		GROUP BY m ORDER BY m`, months)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*MonthFlow, error) {
		var f MonthFlow
		return &f, r.Scan(&f.Month, &f.Income, &f.Expense)
	})
}

type CategoryTotal struct {
	CategoryID string  `json:"category_id"`
	Total      float64 `json:"total"`
}

func CategoryTotals(ctx context.Context, tx pgx.Tx, month string) ([]CategoryTotal, error) {
	rows, err := tx.Query(ctx, `SELECT category_id, sum(amount)::float8 FROM ledger_txn
		WHERE direction = 'expense' AND NOT excluded_from_reports AND to_char(txn_date, 'YYYY-MM') = $1
		GROUP BY category_id ORDER BY 2 DESC`, month)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*CategoryTotal, error) {
		var c CategoryTotal
		return &c, r.Scan(&c.CategoryID, &c.Total)
	})
}
