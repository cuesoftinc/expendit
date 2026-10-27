package service

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

type Ledger struct {
	DB *repository.DB
}

func require(p *middleware.Principal, min model.Role) error {
	if !p.Role.AtLeast(min) {
		return ErrForbidden
	}
	return nil
}

// ── Categories ──────────────────────────────────────────────────────────

var hexColor = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

type CategoryInput struct {
	Name         *string `json:"name"`
	Type         *string `json:"type"`
	Color        *string `json:"color"`
	TaxTreatment *string `json:"tax_treatment"`
	VATTreatment *string `json:"vat_treatment"`
	VATBasis     *string `json:"vat_basis"`
	AIProposed   *bool   `json:"ai_proposed"`
	AINote       *string `json:"ai_note"`
	// Read-only fields the web may echo back; ignored.
	TxnCountYTD *int `json:"txn_count_ytd"`
}

func (in CategoryInput) apply(c *model.Category) error {
	set := func(dst *string, src *string) {
		if src != nil {
			*dst = strings.TrimSpace(*src)
		}
	}
	set(&c.Name, in.Name)
	set(&c.Type, in.Type)
	set(&c.Color, in.Color)
	set(&c.TaxTreatment, in.TaxTreatment)
	set(&c.VATTreatment, in.VATTreatment)
	set(&c.VATBasis, in.VATBasis)
	if in.AIProposed != nil {
		c.AIProposed = *in.AIProposed
	}
	if in.AINote != nil {
		c.AINote = in.AINote
	}
	switch {
	case c.Name == "" || len(c.Name) > 80:
		return invalid("Give the category a name", map[string]any{"name": "required"})
	case c.Type != "expense" && c.Type != "income":
		return invalid("type must be expense or income", nil)
	case !hexColor.MatchString(c.Color):
		return invalid("color must be #RRGGBB", nil)
	case !oneOf(c.TaxTreatment, "taxable_income", "exempt", "ignore"),
		!oneOf(c.VATTreatment, "vatable", "zero_rated", "exempt"),
		!oneOf(c.VATBasis, "inclusive", "exclusive"):
		return invalid("Unknown tax or VAT treatment", nil)
	}
	return nil
}

func oneOf(v string, options ...string) bool {
	for _, o := range options {
		if v == o {
			return true
		}
	}
	return false
}

func (s *Ledger) Categories(ctx context.Context, p *middleware.Principal, archived bool) ([]model.Category, error) {
	var out []model.Category
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		out, err = repository.ListCategories(ctx, tx, archived)
		return err
	})
	return out, err
}

func (s *Ledger) Category(ctx context.Context, p *middleware.Principal, id string) (*model.Category, error) {
	var out *model.Category
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		out, err = repository.GetCategory(ctx, tx, id)
		return err
	})
	return out, err
}

func (s *Ledger) CreateCategory(ctx context.Context, p *middleware.Principal, in CategoryInput) (*model.Category, error) {
	if err := require(p, model.RoleAdmin); err != nil {
		return nil, err
	}
	c := model.Category{OrgID: p.OrgID, Color: "#8A8F98", TaxTreatment: "taxable_income", VATTreatment: "vatable", VATBasis: "inclusive"}
	if err := in.apply(&c); err != nil {
		return nil, err
	}
	var out *model.Category
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		out, err = repository.CreateCategory(ctx, tx, c)
		return err
	})
	return out, categoryConflict(err)
}

func (s *Ledger) UpdateCategory(ctx context.Context, p *middleware.Principal, id string, in CategoryInput) (*model.Category, error) {
	if err := require(p, model.RoleAdmin); err != nil {
		return nil, err
	}
	var out *model.Category
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		c, err := repository.GetCategory(ctx, tx, id)
		if err != nil {
			return err
		}
		taxBefore := c.TaxTreatment + c.VATTreatment + c.VATBasis
		if err := in.apply(c); err != nil {
			return err
		}
		if out, err = repository.UpdateCategory(ctx, tx, *c); err != nil {
			return err
		}
		if taxBefore != c.TaxTreatment+c.VATTreatment+c.VATBasis {
			_, err = repository.BumpDataVersion(ctx, tx, p.OrgID)
		}
		return err
	})
	return out, categoryConflict(err)
}

func categoryConflict(err error) error {
	if err == repository.ErrConflict {
		return newErr(http.StatusConflict, "category_exists", "A category with that name already exists")
	}
	return err
}

func (s *Ledger) DeleteCategory(ctx context.Context, p *middleware.Principal, id string) error {
	if err := require(p, model.RoleAdmin); err != nil {
		return err
	}
	return s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		if used, err := repository.CategoryInUse(ctx, tx, id); err != nil {
			return err
		} else if used {
			return newErr(http.StatusConflict, "category_in_use", "Merge or archive a category that has transactions")
		}
		return repository.DeleteCategory(ctx, tx, id)
	})
}

func (s *Ledger) MergeCategory(ctx context.Context, p *middleware.Principal, id, into string) (*model.Category, int64, error) {
	if err := require(p, model.RoleAdmin); err != nil {
		return nil, 0, err
	}
	if id == into {
		return nil, 0, invalid("Pick a different category to merge into", nil)
	}
	var target *model.Category
	var moved int64
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		source, err := repository.GetCategory(ctx, tx, id)
		if err != nil {
			return err
		}
		if target, err = repository.GetCategory(ctx, tx, into); err != nil {
			return err
		}
		if source.Type != target.Type || target.ArchivedAt != nil {
			return invalid("Merge into an active category of the same type", nil)
		}
		if moved, err = repository.MergeCategory(ctx, tx, id, into); err != nil {
			return err
		}
		_, err = repository.BumpDataVersion(ctx, tx, p.OrgID)
		return err
	})
	return target, moved, err
}

func (s *Ledger) ArchiveCategory(ctx context.Context, p *middleware.Principal, id string, archived bool) (*model.Category, error) {
	if err := require(p, model.RoleAdmin); err != nil {
		return nil, err
	}
	var out *model.Category
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		out, err = repository.SetCategoryArchived(ctx, tx, id, archived)
		return err
	})
	return out, err
}

// ── Transactions ────────────────────────────────────────────────────────

func (s *Ledger) Txns(ctx context.Context, p *middleware.Principal, f repository.TxnFilter) (model.Page[model.Txn], error) {
	var page model.Page[model.Txn]
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		page, err = repository.ListTxns(ctx, tx, f)
		return err
	})
	return page, err
}

func (s *Ledger) Txn(ctx context.Context, p *middleware.Principal, id string) (*model.Txn, error) {
	var t *model.Txn
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		t, err = repository.GetTxn(ctx, tx, id)
		return err
	})
	return t, err
}

type TxnInput struct {
	Description         *string          `json:"description"`
	Amount              *float64         `json:"amount"`
	Direction           *string          `json:"direction"`
	CategoryID          *string          `json:"category_id"`
	TxnDate             *string          `json:"txn_date"`
	ExcludedFromReports *bool            `json:"excluded_from_reports"`
	Anomalies           *json.RawMessage `json:"anomalies"`
}

func (in TxnInput) apply(t *model.Txn) error {
	if in.Description != nil {
		t.Description = strings.TrimSpace(*in.Description)
	}
	if in.Amount != nil {
		t.Amount = *in.Amount
	}
	if in.Direction != nil {
		t.Direction = *in.Direction
	}
	if in.CategoryID != nil {
		t.CategoryID = *in.CategoryID
		t.AICategorized = false
	}
	if in.TxnDate != nil {
		t.TxnDate = *in.TxnDate
	}
	if in.ExcludedFromReports != nil {
		t.ExcludedFromReports = *in.ExcludedFromReports
	}
	if in.Anomalies != nil {
		// "Mark expected" (pages.md B2b): the only accepted write is [].
		if strings.TrimSpace(string(*in.Anomalies)) != "[]" {
			return invalid("anomalies can only be cleared", map[string]any{"anomalies": "must be []"})
		}
		t.Anomalies = []model.Anomaly{}
	}
	if _, err := time.Parse("2006-01-02", t.TxnDate); err != nil {
		return invalid("txn_date must be YYYY-MM-DD", nil)
	}
	switch {
	case t.Description == "" || len(t.Description) > 500:
		return invalid("Describe the transaction", map[string]any{"description": "required"})
	case t.Amount <= 0 || t.Amount > 1e13:
		return invalid("amount must be positive", map[string]any{"amount": "must be > 0"})
	case t.Direction != "income" && t.Direction != "expense":
		return invalid("direction must be income or expense", nil)
	case t.CategoryID == "":
		return invalid("Pick a category", map[string]any{"category_id": "required"})
	}
	return nil
}

func checkCategory(ctx context.Context, tx pgx.Tx, t *model.Txn) error {
	c, err := repository.GetCategory(ctx, tx, t.CategoryID)
	if err == repository.ErrNotFound || (err == nil && (c.ArchivedAt != nil || c.Type != t.Direction)) {
		return invalid("Pick an active category matching the transaction's direction", map[string]any{"category_id": "invalid"})
	}
	return err
}

func (s *Ledger) CreateTxn(ctx context.Context, p *middleware.Principal, in TxnInput) (*model.Txn, error) {
	t := model.Txn{OrgID: p.OrgID}
	if err := in.apply(&t); err != nil {
		return nil, err
	}
	var out *model.Txn
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		if err = checkCategory(ctx, tx, &t); err != nil {
			return err
		}
		if out, err = repository.CreateTxn(ctx, tx, t); err != nil {
			return err
		}
		_, err = repository.BumpDataVersion(ctx, tx, p.OrgID)
		return err
	})
	return out, err
}

func (s *Ledger) UpdateTxn(ctx context.Context, p *middleware.Principal, id string, in TxnInput) (*model.Txn, error) {
	var out *model.Txn
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		t, err := repository.GetTxn(ctx, tx, id)
		if err != nil {
			return err
		}
		if err := in.apply(t); err != nil {
			return err
		}
		if err := checkCategory(ctx, tx, t); err != nil {
			return err
		}
		if out, err = repository.UpdateTxn(ctx, tx, *t); err != nil {
			return err
		}
		_, err = repository.BumpDataVersion(ctx, tx, p.OrgID)
		return err
	})
	return out, err
}

func (s *Ledger) DeleteTxn(ctx context.Context, p *middleware.Principal, id string) error {
	if err := require(p, model.RoleAdmin); err != nil {
		return err
	}
	return s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		if err := repository.DeleteTxn(ctx, tx, id); err != nil {
			return err
		}
		_, err := repository.BumpDataVersion(ctx, tx, p.OrgID)
		return err
	})
}

// ── Reports (aggregates) ────────────────────────────────────────────────

type Runway struct {
	Months   *float64 `json:"months"`
	NAReason *string  `json:"na_reason"`
}

type MonthlyReport struct {
	Currency string                 `json:"currency"`
	Items    []repository.MonthFlow `json:"items"`
	Runway   Runway                 `json:"runway"`
}

// Monthly returns 12 months of plain sums. Runway is a computed figure, so
// it comes from the latest stored ratio report (analytics), never from here.
func (s *Ledger) Monthly(ctx context.Context, p *middleware.Principal) (*MonthlyReport, error) {
	report := &MonthlyReport{}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		org, err := repository.GetOrg(ctx, tx, p.OrgID)
		if err != nil {
			return err
		}
		report.Currency = org.Currency
		if report.Items, err = repository.MonthlyFlows(ctx, tx, 12); err != nil {
			return err
		}
		report.Runway, err = latestRunway(ctx, tx, org.Kind)
		return err
	})
	return report, err
}

func latestRunway(ctx context.Context, tx pgx.Tx, orgKind string) (Runway, error) {
	reason := func(s string) Runway { return Runway{NAReason: &s} }
	if orgKind != "company" {
		return reason("n/a — runway tracks company orgs"), nil
	}
	var months *float64
	var na *string
	err := tx.QueryRow(ctx, `SELECT (r->>'value')::float8, r->>'na_reason' FROM ratio_report, jsonb_array_elements(ratios) r
		WHERE r->>'key' = 'runway_months' ORDER BY computed_at DESC LIMIT 1`).Scan(&months, &na)
	if err == pgx.ErrNoRows {
		return reason("n/a — no ratio report yet"), nil
	}
	return Runway{Months: months, NAReason: na}, err
}

type CategoryReport struct {
	Month string                     `json:"month"`
	Items []repository.CategoryTotal `json:"items"`
}

func (s *Ledger) CategoryTotals(ctx context.Context, p *middleware.Principal, month string) (*CategoryReport, error) {
	if month == "" {
		month = time.Now().Format("2006-01")
	} else if _, err := time.Parse("2006-01", month); err != nil {
		return nil, invalid("month must be YYYY-MM", nil)
	}
	report := &CategoryReport{Month: month}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		report.Items, err = repository.CategoryTotals(ctx, tx, month)
		return err
	})
	return report, err
}
