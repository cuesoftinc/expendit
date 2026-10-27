// Package router maps the HTTP surface (system-design.md §7). Paths follow
// the web contract (web/src/models/repositories) under /api/v1.
package router

import (
	"context"
	"net/http"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/handler"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
)

// Readiness reports whether the instance can serve: Postgres reachable,
// consumers running, outbox publishing.
type Readiness func(ctx context.Context) error

func New(h *handler.Handlers, auth func(http.Handler) http.Handler, corsOrigins []string, ready Readiness) http.Handler {
	api := http.NewServeMux()
	routes := map[string]http.HandlerFunc{
		"GET /api/v1/me": h.Me,

		"GET /api/v1/orgs":                          h.ListOrgs,
		"POST /api/v1/orgs":                         h.CreateOrg,
		"PATCH /api/v1/orgs/{id}":                   h.UpdateOrg,
		"GET /api/v1/orgs/{id}/members":             h.ListMembers,
		"POST /api/v1/orgs/{id}/members":            h.InviteMember,
		"PATCH /api/v1/orgs/{id}/members/{userId}":  h.SetMemberRole,
		"DELETE /api/v1/orgs/{id}/members/{userId}": h.RemoveMember,
		"GET /api/v1/consent":                       h.ListConsents,
		"POST /api/v1/consent":                      h.RecordConsent,

		"GET /api/v1/categories":                 h.ListCategories,
		"POST /api/v1/categories":                h.CreateCategory,
		"GET /api/v1/categories/{id}":            h.GetCategory,
		"PUT /api/v1/categories/{id}":            h.UpdateCategory,
		"DELETE /api/v1/categories/{id}":         h.DeleteCategory,
		"POST /api/v1/categories/{id}/merge":     h.MergeCategory,
		"POST /api/v1/categories/{id}/archive":   h.ArchiveCategory(true),
		"POST /api/v1/categories/{id}/unarchive": h.ArchiveCategory(false),

		"GET /api/v1/transactions":         h.ListTxns,
		"POST /api/v1/transactions":        h.CreateTxn,
		"GET /api/v1/transactions/{id}":    h.GetTxn,
		"PUT /api/v1/transactions/{id}":    h.UpdateTxn,
		"DELETE /api/v1/transactions/{id}": h.DeleteTxn,
		"GET /api/v1/report/monthly":       h.MonthlyReport,
		"GET /api/v1/report/category":      h.CategoryReport,

		// Create-then-upload (§6.1): the file itself goes to api/statements.
		"GET /api/v1/import":                            h.ListImports,
		"POST /api/v1/import":                           h.CreateImport,
		"GET /api/v1/import/{jobId}":                    h.GetImport,
		"POST /api/v1/import/{jobId}/confirm":           h.ConfirmImport,
		"DELETE /api/v1/import/{jobId}":                 h.DiscardImport,
		"PUT /api/v1/import/transactions/{id}/category": h.SetStagedCategory,
		"PUT /api/v1/import/transactions/{id}/include":  h.SetStagedInclude,

		"GET /api/v1/statements":                h.ListStatements,
		"POST /api/v1/statements":               h.CreateStatement,
		"GET /api/v1/statements/{id}":           h.GetStatement,
		"GET /api/v1/statements/{id}/mapping":   h.GetStatement,
		"PATCH /api/v1/statements/{id}/mapping": h.PatchMapping,
		"POST /api/v1/statements/{id}/confirm":  h.ConfirmStatement,

		"GET /api/v1/ratios":          h.GetRatios,
		"POST /api/v1/ratios/compute": h.ComputeRatios,
		"GET /api/v1/tax/profile":     h.TaxProfile,
		"PUT /api/v1/tax/profile":     h.UpdateTaxProfile,
		"GET /api/v1/tax/estimates":   h.TaxEstimates,
	}
	for pattern, fn := range routes {
		api.Handle(pattern, fn)
	}

	root := http.NewServeMux()
	root.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"healthy"}`))
	})
	root.HandleFunc("GET /ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		w.Header().Set("Content-Type", "application/json")
		if err := ready(ctx); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"not_ready"}`))
			return
		}
		_, _ = w.Write([]byte(`{"status":"ready"}`))
	})
	root.Handle("/api/v1/", auth(api))
	root.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":{"code":"not_found","message":"Not found","details":{}}}`))
	})

	return middleware.Chain(root, middleware.Recover, middleware.RequestID, middleware.Logger, middleware.CORS(corsOrigins))
}
