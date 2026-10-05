package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

// ── Ratio reports ───────────────────────────────────────────────────────

type RatioReport struct {
	ID          string          `json:"id"`
	OrgID       string          `json:"org_id"`
	Period      string          `json:"period"`
	Ratios      json.RawMessage `json:"ratios"`
	ComputedAt  time.Time       `json:"computed_at"`
	DataVersion int64           `json:"-"`
}

func GetRatioReport(ctx context.Context, tx pgx.Tx, period string) (*RatioReport, error) {
	var r RatioReport
	err := tx.QueryRow(ctx, `SELECT id, org_id, period, ratios, computed_at, data_version FROM ratio_report WHERE period = $1`, period).
		Scan(&r.ID, &r.OrgID, &r.Period, &r.Ratios, &r.ComputedAt, &r.DataVersion)
	return &r, translate(err)
}

func StoreRatioReport(ctx context.Context, tx pgx.Tx, orgID, period string, ratios json.RawMessage, version int64) error {
	_, err := tx.Exec(ctx, `INSERT INTO ratio_report (org_id, period, ratios, data_version) VALUES ($1, $2, $3, $4)
		ON CONFLICT (org_id, period) DO UPDATE SET ratios = EXCLUDED.ratios, data_version = EXCLUDED.data_version, computed_at = now()
		WHERE ratio_report.data_version <= EXCLUDED.data_version`, orgID, period, []byte(ratios), version)
	return err
}

// ── Tax profile ─────────────────────────────────────────────────────────

type TaxProfile struct {
	ID                 string                     `json:"id"`
	OrgID              string                     `json:"org_id"`
	Jurisdiction       string                     `json:"jurisdiction"`
	TaxpayerKind       string                     `json:"taxpayer_kind"`
	TIN                *string                    `json:"tin"`
	StateOfResidence   *string                    `json:"state_of_residence"`
	RCNumber           *string                    `json:"rc_number"`
	NIN                *string                    `json:"nin"`
	CategoryTreatments map[string]json.RawMessage `json:"category_treatments"`
	AnnualRent         *float64                   `json:"annual_rent"`
	Deductions         map[string]float64         `json:"deductions"`
}

const profileCols = `id, org_id, jurisdiction, taxpayer_kind, tin, state_of_residence, rc_number, nin, category_treatments, annual_rent::float8, deductions`

func scanProfile(row pgx.Row) (*TaxProfile, error) {
	var p TaxProfile
	var treatments, deductions []byte
	if err := row.Scan(&p.ID, &p.OrgID, &p.Jurisdiction, &p.TaxpayerKind, &p.TIN, &p.StateOfResidence, &p.RCNumber, &p.NIN,
		&treatments, &p.AnnualRent, &deductions); err != nil {
		return nil, translate(err)
	}
	if err := json.Unmarshal(treatments, &p.CategoryTreatments); err != nil {
		return nil, err
	}
	return &p, json.Unmarshal(deductions, &p.Deductions)
}

// GetOrCreateProfile returns the org's profile, creating a default one
// (individual for personal orgs, company for company orgs).
func GetOrCreateProfile(ctx context.Context, tx pgx.Tx, orgID, orgKind string) (*TaxProfile, error) {
	kind := "individual"
	if orgKind == "company" {
		kind = "company"
	}
	if _, err := tx.Exec(ctx, `INSERT INTO tax_profile (org_id, taxpayer_kind) VALUES ($1, $2) ON CONFLICT (org_id) DO NOTHING`, orgID, kind); err != nil {
		return nil, err
	}
	return scanProfile(tx.QueryRow(ctx, `SELECT `+profileCols+` FROM tax_profile WHERE org_id = $1`, orgID))
}

func SaveProfile(ctx context.Context, tx pgx.Tx, p TaxProfile) (*TaxProfile, error) {
	return scanProfile(tx.QueryRow(ctx, `UPDATE tax_profile SET taxpayer_kind = $2, tin = $3, state_of_residence = $4, rc_number = $5,
		nin = $6, category_treatments = $7, annual_rent = $8, deductions = $9, updated_at = now() WHERE org_id = $1 RETURNING `+profileCols,
		p.OrgID, p.TaxpayerKind, p.TIN, p.StateOfResidence, p.RCNumber, p.NIN, mustJSON(p.CategoryTreatments), p.AnnualRent, mustJSON(p.Deductions)))
}

// ── Estimates ───────────────────────────────────────────────────────────

type TaxEstimate struct {
	ID             string          `json:"id"`
	ProfileID      string          `json:"profile_id"`
	OrgID          string          `json:"org_id"`
	Kind           string          `json:"kind"`
	Period         string          `json:"period"`
	AmountDue      float64         `json:"amount_due"`
	DueDate        string          `json:"due_date"`
	ComputedFields json.RawMessage `json:"computed_fields"`
	Authority      json.RawMessage `json:"authority"`
	RulesetID      string          `json:"ruleset_id"`
	EstimateOnly   bool            `json:"estimate_only"`
	Banners        json.RawMessage `json:"banners"`
	ComputedAt     time.Time       `json:"computed_at"`
	DataVersion    int64           `json:"-"`
}

func ListEstimates(ctx context.Context, tx pgx.Tx) ([]TaxEstimate, error) {
	rows, err := tx.Query(ctx, `SELECT e.id, p.id, e.org_id, e.kind, e.period, e.amount_due::float8, to_char(e.due_date, 'YYYY-MM-DD'),
		e.computed_fields, e.authority, e.ruleset_id, e.estimate_only, e.banners, e.computed_at, e.data_version
		FROM tax_estimate e JOIN tax_profile p ON p.org_id = e.org_id ORDER BY e.due_date`)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*TaxEstimate, error) {
		var e TaxEstimate
		return &e, r.Scan(&e.ID, &e.ProfileID, &e.OrgID, &e.Kind, &e.Period, &e.AmountDue, &e.DueDate, &e.ComputedFields,
			&e.Authority, &e.RulesetID, &e.EstimateOnly, &e.Banners, &e.ComputedAt, &e.DataVersion)
	})
}

// ReplaceEstimates stores one computation's estimates; an older data
// version never overwrites a newer one.
func ReplaceEstimates(ctx context.Context, tx pgx.Tx, orgID string, version int64, estimates []TaxEstimate) error {
	if _, err := tx.Exec(ctx, `DELETE FROM tax_estimate WHERE org_id = $1 AND data_version <= $2`, orgID, version); err != nil {
		return err
	}
	for _, e := range estimates {
		if _, err := tx.Exec(ctx, `INSERT INTO tax_estimate (org_id, kind, period, amount_due, due_date, computed_fields, authority,
			ruleset_id, estimate_only, banners, data_version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (org_id, kind, period) DO NOTHING`,
			orgID, e.Kind, e.Period, e.AmountDue, e.DueDate, []byte(e.ComputedFields), []byte(e.Authority), e.RulesetID,
			e.EstimateOnly, []byte(e.Banners), version); err != nil {
			return err
		}
	}
	return nil
}

// ── Tax inputs (lookups for analytics) ──────────────────────────────────

type VATRow struct {
	ID           string  `json:"id"`
	Amount       float64 `json:"amount"`
	Direction    string  `json:"direction"`
	VATTreatment string  `json:"vat_treatment"`
	VATBasis     string  `json:"vat_basis"`
}

func VATRows(ctx context.Context, tx pgx.Tx, month string) ([]VATRow, error) {
	rows, err := tx.Query(ctx, `SELECT t.id, t.amount::float8, t.direction, c.vat_treatment, c.vat_basis FROM ledger_txn t
		JOIN category c ON c.id = t.category_id WHERE to_char(t.txn_date, 'YYYY-MM') = $1`, month)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*VATRow, error) {
		var v VATRow
		return &v, r.Scan(&v.ID, &v.Amount, &v.Direction, &v.VATTreatment, &v.VATBasis)
	})
}

func HasExemptSupplies(ctx context.Context, tx pgx.Tx) (bool, error) {
	var ok bool
	err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM category WHERE type = 'income' AND vat_treatment = 'exempt')`).Scan(&ok)
	return ok, err
}

func TrailingTurnover(ctx context.Context, tx pgx.Tx) (float64, error) {
	var total float64
	err := tx.QueryRow(ctx, `SELECT coalesce(sum(amount), 0)::float8 FROM ledger_txn WHERE direction = 'income'
		AND txn_date >= current_date - interval '12 months'`).Scan(&total)
	return total, err
}

type IncomeRow struct {
	ID           string  `json:"id"`
	Amount       float64 `json:"amount"`
	TaxTreatment string  `json:"tax_treatment"`
}

// IncomeRows uses the profile's per-category override when present, else
// the category's own tax_treatment (tax-engine.md §2.3).
func IncomeRows(ctx context.Context, tx pgx.Tx, year string) ([]IncomeRow, error) {
	rows, err := tx.Query(ctx, `SELECT t.id, t.amount::float8,
			coalesce(p.category_treatments -> t.category_id::text ->> 'tax_treatment', c.tax_treatment)
		FROM ledger_txn t JOIN category c ON c.id = t.category_id LEFT JOIN tax_profile p ON p.org_id = t.org_id
		WHERE t.direction = 'income' AND to_char(t.txn_date, 'YYYY') = $1`, year)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*IncomeRow, error) {
		var v IncomeRow
		return &v, r.Scan(&v.ID, &v.Amount, &v.TaxTreatment)
	})
}

// LatestConfirmedFY returns the most recent FY period with a confirmed
// income statement, or "".
func LatestConfirmedFY(ctx context.Context, tx pgx.Tx) (string, error) {
	var period string
	err := tx.QueryRow(ctx, `SELECT period FROM fin_statement WHERE kind = 'income_statement' AND mapping_status = 'confirmed'
		AND period LIKE 'FY%' ORDER BY period DESC LIMIT 1`).Scan(&period)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	return period, err
}
