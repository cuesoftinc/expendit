package handler

import (
	"net/http"
	"strconv"

	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/service"
)

type Handlers struct {
	Identity   *service.Identity
	Ledger     *service.Ledger
	Imports    *service.Imports
	Statements *service.Statements
	Compute    *service.Compute
}

func principal(r *http.Request) *middleware.Principal { return middleware.PrincipalFrom(r.Context()) }

type items[T any] struct {
	Items []T `json:"items"`
}

// ── Identity ────────────────────────────────────────────────────────────

func (h *Handlers) Me(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	orgs, err := h.Identity.Orgs(r.Context(), p)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user_id": p.UserID, "email": p.Email, "org_id": p.OrgID, "role": p.Role, "orgs": orgs})
}

func (h *Handlers) ListOrgs(w http.ResponseWriter, r *http.Request) {
	orgs, err := h.Identity.Orgs(r.Context(), principal(r))
	respond(w, r, http.StatusOK, items[model.Org]{orgs}, err)
}

func (h *Handlers) CreateOrg(w http.ResponseWriter, r *http.Request) {
	var in service.OrgInput
	if !decode(w, r, &in) {
		return
	}
	org, err := h.Identity.CreateOrg(r.Context(), principal(r), in)
	respond(w, r, http.StatusCreated, org, err)
}

func (h *Handlers) UpdateOrg(w http.ResponseWriter, r *http.Request) {
	var in service.OrgPatch
	if !decode(w, r, &in) {
		return
	}
	org, err := h.Identity.UpdateOrg(r.Context(), principal(r), r.PathValue("id"), in)
	respond(w, r, http.StatusOK, org, err)
}

func (h *Handlers) ListMembers(w http.ResponseWriter, r *http.Request) {
	members, err := h.Identity.Members(r.Context(), principal(r), r.PathValue("id"))
	respond(w, r, http.StatusOK, items[model.Member]{members}, err)
}

func (h *Handlers) InviteMember(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email string     `json:"email"`
		Role  model.Role `json:"role"`
	}
	if !decode(w, r, &in) {
		return
	}
	m, err := h.Identity.Invite(r.Context(), principal(r), r.PathValue("id"), in.Email, in.Role)
	respond(w, r, http.StatusCreated, m, err)
}

func (h *Handlers) SetMemberRole(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Role model.Role `json:"role"`
	}
	if !decode(w, r, &in) {
		return
	}
	m, err := h.Identity.SetRole(r.Context(), principal(r), r.PathValue("id"), r.PathValue("userId"), in.Role)
	respond(w, r, http.StatusOK, m, err)
}

func (h *Handlers) RemoveMember(w http.ResponseWriter, r *http.Request) {
	err := h.Identity.RemoveMember(r.Context(), principal(r), r.PathValue("id"), r.PathValue("userId"))
	respond(w, r, http.StatusNoContent, nil, err)
}

func (h *Handlers) ListConsents(w http.ResponseWriter, r *http.Request) {
	c, err := h.Identity.Consents(r.Context(), principal(r))
	respond(w, r, http.StatusOK, items[model.Consent]{c}, err)
}

func (h *Handlers) RecordConsent(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Document string `json:"document"`
		Version  string `json:"version"`
	}
	if !decode(w, r, &in) {
		return
	}
	c, err := h.Identity.RecordConsent(r.Context(), principal(r), in.Document, in.Version)
	respond(w, r, http.StatusCreated, c, err)
}

// ── Categories ──────────────────────────────────────────────────────────

func (h *Handlers) ListCategories(w http.ResponseWriter, r *http.Request) {
	archived := r.URL.Query().Get("archived") == "1" || r.URL.Query().Get("archived") == "true"
	c, err := h.Ledger.Categories(r.Context(), principal(r), archived)
	respond(w, r, http.StatusOK, items[model.Category]{c}, err)
}

func (h *Handlers) GetCategory(w http.ResponseWriter, r *http.Request) {
	c, err := h.Ledger.Category(r.Context(), principal(r), r.PathValue("id"))
	respond(w, r, http.StatusOK, c, err)
}

func (h *Handlers) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var in service.CategoryInput
	if !decode(w, r, &in) {
		return
	}
	c, err := h.Ledger.CreateCategory(r.Context(), principal(r), in)
	respond(w, r, http.StatusCreated, c, err)
}

func (h *Handlers) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	var in service.CategoryInput
	if !decode(w, r, &in) {
		return
	}
	c, err := h.Ledger.UpdateCategory(r.Context(), principal(r), r.PathValue("id"), in)
	respond(w, r, http.StatusOK, c, err)
}

func (h *Handlers) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	respond(w, r, http.StatusNoContent, nil, h.Ledger.DeleteCategory(r.Context(), principal(r), r.PathValue("id")))
}

func (h *Handlers) MergeCategory(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Into string `json:"into"`
	}
	if !decode(w, r, &in) {
		return
	}
	c, moved, err := h.Ledger.MergeCategory(r.Context(), principal(r), r.PathValue("id"), in.Into)
	respond(w, r, http.StatusOK, map[string]any{"category": c, "moved_transactions": moved}, err)
}

func (h *Handlers) ArchiveCategory(archived bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := h.Ledger.ArchiveCategory(r.Context(), principal(r), r.PathValue("id"), archived)
		respond(w, r, http.StatusOK, c, err)
	}
}

// ── Transactions ────────────────────────────────────────────────────────

func floatParam(v string) *float64 {
	if f, err := strconv.ParseFloat(v, 64); err == nil {
		return &f
	}
	return nil
}

func (h *Handlers) ListTxns(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	page, err := h.Ledger.Txns(r.Context(), principal(r), repository.TxnFilter{
		DateFrom: q.Get("date_from"), DateTo: q.Get("date_to"), CategoryID: q.Get("category_id"), Source: q.Get("source"),
		Direction: q.Get("direction"), Search: q.Get("search"), AmountMin: floatParam(q.Get("amount_min")),
		AmountMax: floatParam(q.Get("amount_max")), AnomalyOnly: q.Get("anomaly_only") == "true", Cursor: q.Get("cursor"), Limit: limit,
	})
	respond(w, r, http.StatusOK, page, err)
}

func (h *Handlers) GetTxn(w http.ResponseWriter, r *http.Request) {
	t, err := h.Ledger.Txn(r.Context(), principal(r), r.PathValue("id"))
	respond(w, r, http.StatusOK, t, err)
}

func (h *Handlers) CreateTxn(w http.ResponseWriter, r *http.Request) {
	var in service.TxnInput
	if !decode(w, r, &in) {
		return
	}
	t, err := h.Ledger.CreateTxn(r.Context(), principal(r), in)
	respond(w, r, http.StatusCreated, t, err)
}

func (h *Handlers) UpdateTxn(w http.ResponseWriter, r *http.Request) {
	var in service.TxnInput
	if !decode(w, r, &in) {
		return
	}
	t, err := h.Ledger.UpdateTxn(r.Context(), principal(r), r.PathValue("id"), in)
	respond(w, r, http.StatusOK, t, err)
}

func (h *Handlers) DeleteTxn(w http.ResponseWriter, r *http.Request) {
	respond(w, r, http.StatusNoContent, nil, h.Ledger.DeleteTxn(r.Context(), principal(r), r.PathValue("id")))
}

func (h *Handlers) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	rep, err := h.Ledger.Monthly(r.Context(), principal(r))
	respond(w, r, http.StatusOK, rep, err)
}

func (h *Handlers) CategoryReport(w http.ResponseWriter, r *http.Request) {
	rep, err := h.Ledger.CategoryTotals(r.Context(), principal(r), r.URL.Query().Get("month"))
	respond(w, r, http.StatusOK, rep, err)
}

// ── Imports ─────────────────────────────────────────────────────────────

func (h *Handlers) CreateImport(w http.ResponseWriter, r *http.Request) {
	var in service.CreateImport
	if !decode(w, r, &in) {
		return
	}
	out, err := h.Imports.Create(r.Context(), principal(r), in, r.Header.Get("Idempotency-Key"))
	status := http.StatusCreated
	if err == nil && out.UploadTicket == "" {
		status = http.StatusOK // idempotent replay of an uploaded job
	}
	respond(w, r, status, out, err)
}

func (h *Handlers) ListImports(w http.ResponseWriter, r *http.Request) {
	jobs, err := h.Imports.List(r.Context(), principal(r))
	respond(w, r, http.StatusOK, items[model.ImportJob]{jobs}, err)
}

func (h *Handlers) GetImport(w http.ResponseWriter, r *http.Request) {
	d, err := h.Imports.Get(r.Context(), principal(r), r.PathValue("jobId"))
	respond(w, r, http.StatusOK, d, err)
}

func (h *Handlers) ConfirmImport(w http.ResponseWriter, r *http.Request) {
	res, err := h.Imports.Confirm(r.Context(), principal(r), r.PathValue("jobId"))
	respond(w, r, http.StatusOK, res, err)
}

func (h *Handlers) DiscardImport(w http.ResponseWriter, r *http.Request) {
	respond(w, r, http.StatusNoContent, nil, h.Imports.Discard(r.Context(), principal(r), r.PathValue("jobId")))
}

func (h *Handlers) SetStagedCategory(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CategoryID string `json:"category_id"`
	}
	if !decode(w, r, &in) {
		return
	}
	s, err := h.Imports.SetCategory(r.Context(), principal(r), r.PathValue("id"), in.CategoryID)
	respond(w, r, http.StatusOK, s, err)
}

func (h *Handlers) SetStagedInclude(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Include bool `json:"include"`
	}
	if !decode(w, r, &in) {
		return
	}
	s, err := h.Imports.SetInclude(r.Context(), principal(r), r.PathValue("id"), in.Include)
	respond(w, r, http.StatusOK, s, err)
}

// ── Statements, ratios, tax ─────────────────────────────────────────────

func (h *Handlers) CreateStatement(w http.ResponseWriter, r *http.Request) {
	var in service.StatementInput
	if !decode(w, r, &in) {
		return
	}
	out, err := h.Statements.Create(r.Context(), principal(r), in, r.Header.Get("Idempotency-Key"))
	respond(w, r, http.StatusCreated, out, err)
}

func (h *Handlers) ListStatements(w http.ResponseWriter, r *http.Request) {
	s, err := h.Statements.List(r.Context(), principal(r))
	respond(w, r, http.StatusOK, items[repository.Statement]{s}, err)
}

func (h *Handlers) GetStatement(w http.ResponseWriter, r *http.Request) {
	d, err := h.Statements.Get(r.Context(), principal(r), r.PathValue("id"))
	respond(w, r, http.StatusOK, d, err)
}

func (h *Handlers) PatchMapping(w http.ResponseWriter, r *http.Request) {
	var in service.MappingPatch
	if !decode(w, r, &in) {
		return
	}
	d, err := h.Statements.PatchMapping(r.Context(), principal(r), r.PathValue("id"), in)
	respond(w, r, http.StatusOK, d, err)
}

func (h *Handlers) ConfirmStatement(w http.ResponseWriter, r *http.Request) {
	s, err := h.Statements.Confirm(r.Context(), principal(r), r.PathValue("id"))
	respond(w, r, http.StatusOK, s, err)
}

func (h *Handlers) GetRatios(w http.ResponseWriter, r *http.Request) {
	v, err := h.Compute.Ratios(r.Context(), principal(r), r.URL.Query().Get("period"), false)
	respond(w, r, http.StatusOK, v, err)
}

func (h *Handlers) ComputeRatios(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Period string `json:"period"`
	}
	if !decode(w, r, &in) {
		return
	}
	v, err := h.Compute.Ratios(r.Context(), principal(r), in.Period, true)
	respond(w, r, http.StatusAccepted, v, err)
}

func (h *Handlers) TaxProfile(w http.ResponseWriter, r *http.Request) {
	p, err := h.Compute.Profile(r.Context(), principal(r))
	respond(w, r, http.StatusOK, p, err)
}

func (h *Handlers) UpdateTaxProfile(w http.ResponseWriter, r *http.Request) {
	var in service.ProfilePatch
	if !decode(w, r, &in) {
		return
	}
	p, err := h.Compute.UpdateProfile(r.Context(), principal(r), in)
	respond(w, r, http.StatusOK, p, err)
}

func (h *Handlers) TaxEstimates(w http.ResponseWriter, r *http.Request) {
	v, err := h.Compute.Estimates(r.Context(), principal(r))
	respond(w, r, http.StatusOK, v, err)
}

func respond(w http.ResponseWriter, r *http.Request, status int, v any, err error) {
	if err != nil {
		fail(w, r, err)
		return
	}
	if status == http.StatusNoContent {
		w.WriteHeader(status)
		return
	}
	writeJSON(w, status, v)
}
