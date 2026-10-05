package service

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"github.com/cuesoftinc/expendit/api/common/internal/ratelimit"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/ticket"
)

// canonicalKeys is line-items.md's closed vocabulary (schema-as-boundary).
var canonicalKeys = map[string]string{}

func init() {
	for kind, keys := range map[string][]string{
		"balance_sheet": {"cash_and_equivalents", "receivables", "inventory", "current_assets_other", "current_assets", "ppe",
			"intangibles", "noncurrent_assets_other", "total_assets", "payables", "short_term_debt", "current_liabilities_other",
			"current_liabilities", "long_term_debt", "noncurrent_liabilities_other", "total_liabilities", "share_capital",
			"retained_earnings", "equity"},
		"income_statement": {"revenue", "cogs", "gross_profit", "opex", "depreciation_amortization", "operating_profit",
			"interest_expense", "interest_income", "tax_expense", "net_income"},
		"cash_flow": {"cfo", "cfi", "cff", "capex", "net_change_in_cash"},
	} {
		for _, k := range keys {
			canonicalKeys[k] = kind
		}
	}
}

type Statements struct {
	DB       *repository.DB
	Imports  *Imports // shares ticketing and limits
	Compute  *Compute
	Tickets  *ticket.Signer
	Limiter  *ratelimit.Limiter
	MaxBytes int64
}

type StatementInput struct {
	Kind     string `json:"kind"`
	Period   string `json:"period"`
	Currency string `json:"currency"`
	// Upload path.
	FileName string `json:"file_name"`
	FileType string `json:"file_type"`
	Size     int64  `json:"size"`
	// Manual entry path.
	LineItems []struct {
		CanonicalKey string  `json:"canonical_key"`
		Amount       float64 `json:"amount"`
		Label        string  `json:"label"`
	} `json:"line_items"`
}

type StatementCreated struct {
	StatementID   string `json:"statement_id"`
	MappingStatus string `json:"mapping_status"`
	UploadTicket  string `json:"upload_ticket,omitempty"`
	ExpiresAt     string `json:"expires_at,omitempty"`
	MaxBytes      int64  `json:"max_bytes,omitempty"`
}

// Create: an upload (returns a ticket, §6.3) or a manual entry (staged at
// once, validated by the compute pool). Admin and above.
func (s *Statements) Create(ctx context.Context, p *middleware.Principal, in StatementInput, idemKey string) (*StatementCreated, error) {
	if err := require(p, model.RoleAdmin); err != nil {
		return nil, err
	}
	if !oneOf(in.Kind, "balance_sheet", "income_statement", "cash_flow") {
		return nil, invalid("kind must be balance_sheet, income_statement or cash_flow", nil)
	}
	if !statementPeriod.MatchString(in.Period) {
		return nil, invalid("period must be YYYY-Qn, YYYY-H1/H2 or FYYYYY", nil)
	}
	manual := len(in.LineItems) > 0
	if manual {
		for _, li := range in.LineItems {
			if canonicalKeys[li.CanonicalKey] != in.Kind {
				return nil, invalid("Every line item needs a canonical key for this statement kind", map[string]any{"canonical_key": li.CanonicalKey})
			}
		}
	} else {
		in.FileType = strings.ToLower(in.FileType)
		if !oneOf(in.FileType, "csv", "xlsx", "pdf", "image") {
			return nil, newErr(http.StatusUnsupportedMediaType, "unsupported_type", "Upload a CSV, XLSX or PDF statement")
		}
		if in.Size <= 0 || in.Size > s.MaxBytes {
			return nil, &Error{Status: http.StatusRequestEntityTooLarge, Code: "file_too_large", Message: "Files can be at most 15 MB",
				Details: map[string]any{"max_bytes": s.MaxBytes}}
		}
		if ok, wait := s.Limiter.Take(ctx, "org:"+p.OrgID, 1,
			ratelimit.Rule{Name: "statements-hour", Max: 10, Window: time.Hour}); !ok {
			return nil, &Error{Status: http.StatusTooManyRequests, Code: "rate_limited", Message: "Too many statement uploads; try again later", RetryAfter: wait}
		}
	}
	var key *string
	if idemKey = strings.TrimSpace(idemKey); idemKey != "" {
		key = &idemKey
	}

	out := &StatementCreated{}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		org, err := repository.GetOrg(ctx, tx, p.OrgID)
		if err != nil {
			return err
		}
		if org.Kind != "company" {
			return invalid("Financial statements belong to company organizations", nil)
		}
		if in.Currency == "" {
			in.Currency = org.Currency
		}
		status, source := "awaiting_upload", in.FileType
		if manual {
			status, source = "staged", "manual"
		}
		creator := p.UserID
		st, existing, err := repository.CreateStatement(ctx, tx, repository.Statement{OrgID: p.OrgID, Kind: in.Kind, Period: in.Period,
			Currency: in.Currency, SourceFileType: source, MappingStatus: status, CreatedBy: &creator}, key)
		if err != nil {
			return err
		}
		out.StatementID, out.MappingStatus = st.ID, st.MappingStatus
		if existing {
			return nil
		}
		if manual {
			for _, li := range in.LineItems {
				k := li.CanonicalKey
				if err := repository.InsertLineItem(ctx, tx, p.OrgID, st.ID, repository.LineItem{CanonicalKey: &k, SourceLabel: li.Label,
					Amount: li.Amount, Status: "mapped", MappedBy: "user"}); err != nil {
					return err
				}
			}
			return s.Compute.requestValidation(ctx, tx, st)
		}
		encoded, claims := s.Tickets.Issue(p.OrgID, ticket.Target{Kind: "fin_statement", ID: st.ID}, in.FileType, s.MaxBytes, s.Compute.Now())
		out.UploadTicket, out.ExpiresAt, out.MaxBytes = encoded, time.Unix(claims.EXP, 0).UTC().Format(time.RFC3339), s.MaxBytes
		return repository.InsertTicket(ctx, tx, model.UploadTicket{JTI: claims.JTI, OrgID: p.OrgID, TargetKind: "fin_statement",
			TargetID: st.ID, FileType: in.FileType, MaxBytes: s.MaxBytes, ExpiresAt: time.Unix(claims.EXP, 0)})
	})
	return out, err
}

func (s *Statements) List(ctx context.Context, p *middleware.Principal) ([]repository.Statement, error) {
	var out []repository.Statement
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		out, err = repository.ListStatements(ctx, tx)
		return err
	})
	return out, err
}

type MappingDetail struct {
	Statement *repository.Statement `json:"statement"`
	LineItems []repository.LineItem `json:"line_items"`
}

func (s *Statements) Get(ctx context.Context, p *middleware.Principal, id string) (*MappingDetail, error) {
	d := &MappingDetail{}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		if d.Statement, err = repository.GetStatement(ctx, tx, id, false); err != nil {
			return err
		}
		d.LineItems, err = repository.ListLineItems(ctx, tx, id)
		return err
	})
	return d, err
}

type MappingPatch struct {
	Updates []struct {
		LineItemID   string  `json:"line_item_id"`
		CanonicalKey *string `json:"canonical_key"`
	} `json:"updates"`
	Additions []struct {
		CanonicalKey string  `json:"canonical_key"`
		Amount       float64 `json:"amount"`
		Label        string  `json:"label"`
	} `json:"additions"`
	Currency *string `json:"currency"`
}

// PatchMapping saves the user's edits, bumps mapping_version and asks the
// compute pool to revalidate (§6.4).
func (s *Statements) PatchMapping(ctx context.Context, p *middleware.Principal, id string, in MappingPatch) (*MappingDetail, error) {
	if err := require(p, model.RoleAdmin); err != nil {
		return nil, err
	}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		st, err := repository.GetStatement(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if st.MappingStatus != "staged" {
			return newErr(http.StatusConflict, "statement_not_editable", "Only staged statements can be remapped")
		}
		for _, u := range in.Updates {
			if u.CanonicalKey != nil && canonicalKeys[*u.CanonicalKey] != st.Kind {
				return invalid("Unknown canonical key for this statement kind", map[string]any{"canonical_key": *u.CanonicalKey})
			}
			if err := repository.SetLineItemKey(ctx, tx, id, u.LineItemID, u.CanonicalKey); err != nil {
				return err
			}
		}
		for _, a := range in.Additions {
			if canonicalKeys[a.CanonicalKey] != st.Kind {
				return invalid("Unknown canonical key for this statement kind", map[string]any{"canonical_key": a.CanonicalKey})
			}
			k := a.CanonicalKey
			if err := repository.InsertLineItem(ctx, tx, p.OrgID, id, repository.LineItem{CanonicalKey: &k, SourceLabel: a.Label,
				Amount: a.Amount, Status: "mapped", MappedBy: "user"}); err != nil {
				return err
			}
		}
		if in.Currency != nil {
			if !currencyCode.MatchString(*in.Currency) {
				return invalid("currency must be an ISO code", nil)
			}
			if err := repository.SetStatementCurrency(ctx, tx, id, *in.Currency); err != nil {
				return err
			}
		}
		if st.MappingVersion, err = repository.BumpMapping(ctx, tx, id); err != nil {
			return err
		}
		return s.Compute.requestValidation(ctx, tx, st)
	})
	if err != nil {
		return nil, err
	}
	return s.Get(ctx, p, id)
}

// Confirm is a CRUD check against the stored, versioned validation (S-8).
func (s *Statements) Confirm(ctx context.Context, p *middleware.Principal, id string) (*repository.Statement, error) {
	if err := require(p, model.RoleAdmin); err != nil {
		return nil, err
	}
	var out *repository.Statement
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		st, err := repository.GetStatement(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if st.MappingStatus == "confirmed" {
			out = st
			return nil
		}
		if st.MappingStatus != "staged" {
			return newErr(http.StatusConflict, "statement_not_editable", "Only staged statements can be confirmed")
		}
		if st.Validation == nil {
			return ErrValidationPending
		}
		var v repository.Validation
		if err := json.Unmarshal(*st.Validation, &v); err != nil {
			return err
		}
		if v.MappingVersion != st.MappingVersion {
			return ErrValidationPending
		}
		if !v.OK && len(v.Codes) > 0 {
			messages := map[string]string{
				"mapping_identity_violation":  "total_assets must equal total_liabilities + equity within ±1%",
				"unmapped_threshold_exceeded": "More than 20% of statement value is unmapped; map or remove rows before confirming",
				"currency_mismatch":           "The statement currency doesn't match the organization's",
			}
			return &Error{Status: http.StatusUnprocessableEntity, Code: v.Codes[0], Message: messages[v.Codes[0]], Details: map[string]any{"codes": v.Codes}}
		}
		if err := repository.ConfirmStatement(ctx, tx, st); err != nil {
			return err
		}
		if _, err := repository.BumpDataVersion(ctx, tx, p.OrgID); err != nil {
			return err
		}
		// Ratios for the period follow every confirm (§6.5).
		if err := s.Compute.requestRatios(ctx, tx, p.OrgID, st.Period); err != nil {
			return err
		}
		out, err = repository.GetStatement(ctx, tx, id, false)
		return err
	})
	return out, err
}

// onUpload is OnUploadReceived's branch for statements; tx is already
// narrowed to the org.
func (s *Statements) onUpload(ctx context.Context, tx pgx.Tx, msg uploadReceived) error {
	st, err := repository.GetStatement(ctx, tx, msg.Target.ID, true)
	if err == repository.ErrNotFound || (err == nil && st.MappingStatus != "awaiting_upload") {
		return nil
	} else if err != nil {
		return err
	}
	key := msg.Object.Key
	if err := repository.SetStatementStatus(ctx, tx, st.ID, "processing", nil, &key); err != nil {
		return err
	}
	aiAllowed := false
	if st.CreatedBy != nil {
		if aiAllowed, err = repository.HasAIConsent(ctx, tx, *st.CreatedBy); err != nil {
			return err
		}
	}
	return repository.Enqueue(ctx, tx, kafka.TopicStatementReady, st.ID, map[string]any{
		"statement_id": st.ID, "org_id": st.OrgID, "kind": st.Kind, "period": st.Period, "currency": st.Currency,
		"file_name": msg.FileName, "file_type": msg.FileType, "file": msg.Object, "ai_allowed": aiAllowed,
	})
}

type statementMapped struct {
	StatementID string  `json:"statement_id"`
	OrgID       string  `json:"org_id"`
	Status      string  `json:"status"`
	ErrorCode   *string `json:"error_code"`
	LineItems   []struct {
		SourceLabel  string   `json:"source_label"`
		Amount       float64  `json:"amount"`
		CanonicalKey *string  `json:"canonical_key"`
		Confidence   *float64 `json:"confidence"`
		MappedBy     string   `json:"mapped_by"`
		Derived      bool     `json:"derived"`
	} `json:"line_items"`
	Validation json.RawMessage `json:"validation"`
}

// OnStatementMapped stores analytics' rows and validation (mapping v1),
// then deletes the raw file (S-4).
func (s *Statements) OnStatementMapped(ctx context.Context, raw json.RawMessage) error {
	var msg statementMapped
	if err := json.Unmarshal(raw, &msg); err != nil {
		return nil
	}
	var objectKey *string
	err := s.DB.InOrg(ctx, msg.OrgID, func(tx pgx.Tx) error {
		st, err := repository.GetStatement(ctx, tx, msg.StatementID, true)
		if err == repository.ErrNotFound {
			return nil
		} else if err != nil {
			return err
		}
		objectKey = st.ObjectKey
		if st.MappingStatus != "processing" {
			return nil
		}
		if msg.Status == "failed" {
			return repository.SetStatementStatus(ctx, tx, st.ID, "failed", msg.ErrorCode, nil)
		}
		for _, li := range msg.LineItems {
			status := "unmapped"
			if li.CanonicalKey != nil {
				status = "mapped"
			}
			if err := repository.InsertLineItem(ctx, tx, msg.OrgID, st.ID, repository.LineItem{CanonicalKey: li.CanonicalKey,
				SourceLabel: li.SourceLabel, Amount: li.Amount, Status: status, Confidence: li.Confidence, MappedBy: li.MappedBy,
				Derived: li.Derived}); err != nil {
				return err
			}
		}
		if err := repository.SetStatementStatus(ctx, tx, st.ID, "staged", nil, nil); err != nil {
			return err
		}
		if len(msg.Validation) > 0 {
			return repository.StoreValidation(ctx, tx, st.ID, msg.Validation, st.MappingVersion)
		}
		return nil
	})
	if err == nil && objectKey != nil {
		s.Imports.deleteObject(ctx, *objectKey)
	}
	return err
}

// UploadRouter lets the import consumer hand statement uploads over.
func (s *Statements) UploadRouter() func(context.Context, pgx.Tx, uploadReceived) error {
	return s.onUpload
}
