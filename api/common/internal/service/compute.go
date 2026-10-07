package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

// Compute gathers inputs for analytics (lookups only), queues
// compute.requested, and stores compute.results exactly as computed (D5).
// Results carry the org data_version they were computed from; stale ones
// are dropped, and reads report "recomputing" until fresh ones land.
type Compute struct {
	DB  *repository.DB
	Now func() time.Time
}

var statementPeriod = regexp.MustCompile(`^(\d{4}-Q[1-4]|\d{4}-H[12]|FY\d{4})$`)

func (s *Compute) request(ctx context.Context, tx pgx.Tx, orgID, kind string, extra map[string]any, inputs any) error {
	org, err := repository.GetOrg(ctx, tx, orgID)
	if err != nil {
		return err
	}
	msg := map[string]any{
		"request_id":   uuid.NewString(),
		"org_id":       orgID,
		"kind":         kind,
		"data_version": org.DataVersion,
		"inputs":       inputs,
	}
	for k, v := range extra {
		msg[k] = v
	}
	if err := repository.Enqueue(ctx, tx, kafka.TopicComputeRequested, orgID, msg); err != nil {
		return err
	}
	slog.Info("computation requested", "step", "compute.requested", "kind", kind, "org_id", orgID,
		"request_id", msg["request_id"], "data_version", org.DataVersion)
	return nil
}

// ── Statement validation ────────────────────────────────────────────────

func (s *Compute) requestValidation(ctx context.Context, tx pgx.Tx, st *repository.Statement) error {
	items, err := repository.ListLineItems(ctx, tx, st.ID)
	if err != nil {
		return err
	}
	rows := []map[string]any{}
	for _, l := range items {
		if l.Derived {
			continue // analytics re-derives from the source rows
		}
		row := map[string]any{"amount": l.Amount, "status": l.Status, "canonical_key": ""}
		if l.CanonicalKey != nil {
			row["canonical_key"] = *l.CanonicalKey
		}
		rows = append(rows, row)
	}
	return s.request(ctx, tx, st.OrgID, "statement_validation", map[string]any{"period": st.Period}, map[string]any{
		"statement_id": st.ID, "kind": st.Kind, "mapping_version": st.MappingVersion, "line_items": rows,
	})
}

// ── Ratios ──────────────────────────────────────────────────────────────

func previousPeriod(period string) string {
	var y, n int
	switch {
	case len(period) == 7 && period[5] == 'Q':
		y, _ = strconv.Atoi(period[:4])
		n, _ = strconv.Atoi(period[6:])
		if n == 1 {
			return fmt.Sprintf("%d-Q4", y-1)
		}
		return fmt.Sprintf("%d-Q%d", y, n-1)
	case len(period) == 7 && period[5] == 'H':
		y, _ = strconv.Atoi(period[:4])
		if period[6] == '1' {
			return fmt.Sprintf("%d-H2", y-1)
		}
		return fmt.Sprintf("%d-H1", y)
	case len(period) == 6 && period[:2] == "FY":
		y, _ = strconv.Atoi(period[2:])
		return fmt.Sprintf("FY%d", y-1)
	}
	return ""
}

func (s *Compute) requestRatios(ctx context.Context, tx pgx.Tx, orgID, period string) error {
	current, err := repository.ConfirmedValues(ctx, tx, period)
	if err != nil {
		return err
	}
	if current == nil {
		current = &repository.PeriodValues{Period: period, Kinds: []string{}, Values: map[string]repository.KeyValue{}}
	}
	inputs := map[string]any{"period": period, "current": current}
	if prev := previousPeriod(period); prev != "" {
		if v, err := repository.ConfirmedValues(ctx, tx, prev); err != nil {
			return err
		} else if v != nil {
			inputs["previous"] = v
		}
		if v, err := repository.ConfirmedValues(ctx, tx, previousPeriod(prev)); err != nil {
			return err
		} else if v != nil {
			inputs["previous_previous"] = v
		}
	}
	if inputs["ledger_monthly_nets"], err = repository.LedgerMonthlyNets(ctx, tx); err != nil {
		return err
	}
	if inputs["cash_flow_periods"], err = repository.ConfirmedCashFlowPeriods(ctx, tx); err != nil {
		return err
	}
	return s.request(ctx, tx, orgID, "ratios", map[string]any{"period": period}, inputs)
}

type RatioView struct {
	ID         *string         `json:"id"`
	OrgID      string          `json:"org_id"`
	Period     string          `json:"period"`
	Ratios     json.RawMessage `json:"ratios"`
	ComputedAt *time.Time      `json:"computed_at"`
	Status     string          `json:"status"` // current | recomputing
}

// Ratios returns the stored report; when it is missing or stale it queues
// a recomputation and says so.
func (s *Compute) Ratios(ctx context.Context, p *middleware.Principal, period string, force bool) (*RatioView, error) {
	if !statementPeriod.MatchString(period) {
		return nil, invalid("period must be YYYY-Qn, YYYY-H1/H2 or FYYYYY", nil)
	}
	if force && !p.Role.AtLeast(model.RoleAdmin) {
		return nil, ErrForbidden
	}
	view := &RatioView{OrgID: p.OrgID, Period: period, Ratios: json.RawMessage("[]"), Status: "current"}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		org, err := repository.GetOrg(ctx, tx, p.OrgID)
		if err != nil {
			return err
		}
		report, err := repository.GetRatioReport(ctx, tx, period)
		if err != nil && err != repository.ErrNotFound {
			return err
		}
		if err == nil {
			view.ID, view.Ratios, view.ComputedAt = &report.ID, report.Ratios, &report.ComputedAt
		}
		if force || err == repository.ErrNotFound || report.DataVersion < org.DataVersion {
			view.Status = "recomputing"
			return s.requestRatios(ctx, tx, p.OrgID, period)
		}
		return nil
	})
	return view, err
}

// ── Tax ─────────────────────────────────────────────────────────────────

func (s *Compute) requestTax(ctx context.Context, tx pgx.Tx, orgID string) error {
	org, err := repository.GetOrg(ctx, tx, orgID)
	if err != nil {
		return err
	}
	profile, err := repository.GetOrCreateProfile(ctx, tx, orgID, org.Kind)
	if err != nil {
		return err
	}
	now := s.Now()
	var requests []map[string]any
	if profile.TaxpayerKind == "company" {
		exempt, err := repository.HasExemptSupplies(ctx, tx)
		if err != nil {
			return err
		}
		turnover, err := repository.TrailingTurnover(ctx, tx)
		if err != nil {
			return err
		}
		// The last completed month (filing due) and the month in progress.
		for _, month := range []string{now.AddDate(0, -1, 0).Format("2006-01"), now.Format("2006-01")} {
			rows, err := repository.VATRows(ctx, tx, month)
			if err != nil {
				return err
			}
			requests = append(requests, map[string]any{"kind": "vat", "period": month, "transactions": rows,
				"has_exempt_supplies": exempt, "trailing_12m_turnover": turnover})
		}
		basis, err := repository.LatestConfirmedFY(ctx, tx)
		if err != nil {
			return err
		}
		if basis != "" {
			values, err := repository.ConfirmedValues(ctx, tx, basis)
			if err != nil {
				return err
			}
			requests = append(requests, map[string]any{"kind": "cit", "period": fmt.Sprintf("FY%d", now.Year()),
				"basis_period": basis, "line_items": values.Values})
		}
	} else {
		year := now.Format("2006")
		rows, err := repository.IncomeRows(ctx, tx, year)
		if err != nil {
			return err
		}
		req := map[string]any{"kind": "pit", "period": year, "income": rows, "deductions": profile.Deductions}
		if profile.AnnualRent != nil {
			req["annual_rent"] = *profile.AnnualRent
		}
		requests = append(requests, req)
	}
	inputs := map[string]any{
		"today":           now.Format("2006-01-02"),
		"taxpayer_kind":   profile.TaxpayerKind,
		"fiscal_year_end": org.FiscalYearEnd,
		"requests":        requests,
	}
	if profile.StateOfResidence != nil {
		inputs["state_of_residence"] = *profile.StateOfResidence
	}
	return s.request(ctx, tx, orgID, "tax_estimate", nil, inputs)
}

type EstimatesView struct {
	Items  []repository.TaxEstimate `json:"items"`
	Status string                   `json:"status"`
}

func (s *Compute) Estimates(ctx context.Context, p *middleware.Principal) (*EstimatesView, error) {
	view := &EstimatesView{Status: "current"}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		org, err := repository.GetOrg(ctx, tx, p.OrgID)
		if err != nil {
			return err
		}
		if view.Items, err = repository.ListEstimates(ctx, tx); err != nil {
			return err
		}
		stale := len(view.Items) == 0
		for _, e := range view.Items {
			stale = stale || e.DataVersion < org.DataVersion
		}
		if stale {
			view.Status = "recomputing"
			return s.requestTax(ctx, tx, p.OrgID)
		}
		return nil
	})
	return view, err
}

func (s *Compute) Profile(ctx context.Context, p *middleware.Principal) (*repository.TaxProfile, error) {
	var out *repository.TaxProfile
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		org, err := repository.GetOrg(ctx, tx, p.OrgID)
		if err != nil {
			return err
		}
		out, err = repository.GetOrCreateProfile(ctx, tx, p.OrgID, org.Kind)
		return err
	})
	return out, err
}

type ProfilePatch struct {
	TaxpayerKind       *string                     `json:"taxpayer_kind"`
	TIN                *string                     `json:"tin"`
	StateOfResidence   *string                     `json:"state_of_residence"`
	RCNumber           *string                     `json:"rc_number"`
	NIN                *string                     `json:"nin"`
	CategoryTreatments *map[string]json.RawMessage `json:"category_treatments"`
	AnnualRent         *float64                    `json:"annual_rent"`
	Deductions         *map[string]float64         `json:"deductions"`
	// Echoed read-only fields.
	ID           *string `json:"id"`
	OrgID        *string `json:"org_id"`
	Jurisdiction *string `json:"jurisdiction"`
}

func (s *Compute) UpdateProfile(ctx context.Context, p *middleware.Principal, in ProfilePatch) (*repository.TaxProfile, error) {
	if err := require(p, model.RoleAdmin); err != nil {
		return nil, err
	}
	var out *repository.TaxProfile
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		org, err := repository.GetOrg(ctx, tx, p.OrgID)
		if err != nil {
			return err
		}
		prof, err := repository.GetOrCreateProfile(ctx, tx, p.OrgID, org.Kind)
		if err != nil {
			return err
		}
		if in.TaxpayerKind != nil {
			if !oneOf(*in.TaxpayerKind, "individual", "company") {
				return invalid("taxpayer_kind must be individual or company", nil)
			}
			prof.TaxpayerKind = *in.TaxpayerKind
		}
		for dst, src := range map[**string]*string{&prof.TIN: in.TIN, &prof.StateOfResidence: in.StateOfResidence, &prof.RCNumber: in.RCNumber, &prof.NIN: in.NIN} {
			if src != nil {
				v := *src
				*dst = &v
			}
		}
		if prof.StateOfResidence != nil && *prof.StateOfResidence != "" && !stateCode.MatchString(*prof.StateOfResidence) {
			return invalid("state_of_residence must be a state code like NG-LA", nil)
		}
		if in.CategoryTreatments != nil {
			prof.CategoryTreatments = *in.CategoryTreatments
		}
		if in.AnnualRent != nil {
			prof.AnnualRent = in.AnnualRent
		}
		if in.Deductions != nil {
			prof.Deductions = *in.Deductions
		}
		if out, err = repository.SaveProfile(ctx, tx, *prof); err != nil {
			return err
		}
		_, err = repository.BumpDataVersion(ctx, tx, p.OrgID)
		return err
	})
	return out, err
}

// ── Results ─────────────────────────────────────────────────────────────

type computeResult struct {
	RequestID   string          `json:"request_id"`
	OrgID       string          `json:"org_id"`
	Kind        string          `json:"kind"`
	DataVersion int64           `json:"data_version"`
	Period      string          `json:"period"`
	StatementID string          `json:"statement_id"`
	Status      string          `json:"status"`
	ErrorCode   *string         `json:"error_code"`
	Validation  json.RawMessage `json:"validation"`
	Ratios      json.RawMessage `json:"ratios"`
	Estimates   []struct {
		Kind           string          `json:"kind"`
		Period         string          `json:"period"`
		AmountDue      float64         `json:"amount_due"`
		DueDate        string          `json:"due_date"`
		ComputedFields json.RawMessage `json:"computed_fields"`
		Authority      json.RawMessage `json:"authority"`
		RulesetID      string          `json:"ruleset_id"`
		EstimateOnly   bool            `json:"estimate_only"`
		Banners        json.RawMessage `json:"banners"`
	} `json:"estimates"`
}

// OnComputeResults stores results computed from the current data version;
// anything older is superseded by a request already in flight.
func (s *Compute) OnComputeResults(ctx context.Context, raw json.RawMessage) error {
	var msg computeResult
	if err := json.Unmarshal(raw, &msg); err != nil {
		return nil
	}
	slog.Info("computation result received", "step", "compute.results", "kind", msg.Kind, "org_id", msg.OrgID,
		"request_id", msg.RequestID, "status", msg.Status, "error_code", deref(msg.ErrorCode), "data_version", msg.DataVersion)
	return s.DB.InOrg(ctx, msg.OrgID, func(tx pgx.Tx) error {
		if msg.Status != "ok" {
			return nil // reads keep reporting "recomputing"; the next change retries
		}
		switch msg.Kind {
		case "statement_validation":
			var v struct {
				MappingVersion int `json:"mapping_version"`
				Derived        []struct {
					CanonicalKey string  `json:"canonical_key"`
					Amount       float64 `json:"amount"`
				} `json:"derived"`
			}
			if err := json.Unmarshal(msg.Validation, &v); err != nil {
				return nil
			}
			return s.storeValidation(ctx, tx, msg.OrgID, msg.StatementID, msg.Validation, v.MappingVersion, v.Derived)
		case "ratios":
			org, err := repository.GetOrg(ctx, tx, msg.OrgID)
			if err != nil || msg.DataVersion < org.DataVersion {
				return err
			}
			return repository.StoreRatioReport(ctx, tx, msg.OrgID, msg.Period, msg.Ratios, msg.DataVersion)
		case "tax_estimate":
			org, err := repository.GetOrg(ctx, tx, msg.OrgID)
			if err != nil || msg.DataVersion < org.DataVersion {
				return err
			}
			estimates := make([]repository.TaxEstimate, 0, len(msg.Estimates))
			for _, e := range msg.Estimates {
				estimates = append(estimates, repository.TaxEstimate{Kind: e.Kind, Period: e.Period, AmountDue: e.AmountDue,
					DueDate: e.DueDate, ComputedFields: e.ComputedFields, Authority: e.Authority, RulesetID: e.RulesetID,
					EstimateOnly: e.EstimateOnly, Banners: e.Banners})
			}
			return repository.ReplaceEstimates(ctx, tx, msg.OrgID, msg.DataVersion, estimates)
		}
		return nil
	})
}

func (s *Compute) storeValidation(ctx context.Context, tx pgx.Tx, orgID, statementID string, validation json.RawMessage, version int,
	derived []struct {
		CanonicalKey string  `json:"canonical_key"`
		Amount       float64 `json:"amount"`
	}) error {
	st, err := repository.GetStatement(ctx, tx, statementID, true)
	if err == repository.ErrNotFound || (err == nil && st.MappingVersion != version) {
		return nil // superseded by a newer edit
	} else if err != nil {
		return err
	}
	rows := make([]repository.LineItem, 0, len(derived))
	for _, d := range derived {
		key := d.CanonicalKey
		rows = append(rows, repository.LineItem{CanonicalKey: &key, Amount: d.Amount})
	}
	if err := repository.ReplaceDerived(ctx, tx, orgID, statementID, rows); err != nil {
		return err
	}
	return repository.StoreValidation(ctx, tx, statementID, validation, version)
}

// ErrValidationPending is §6.4's 409 while a recomputation is in flight.
var ErrValidationPending = newErr(http.StatusConflict, "validation_pending", "Still checking your latest edits; try again in a moment")
