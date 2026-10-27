package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/cuesoftinc/expendit/api/common/internal/handler"
)

func TestInternalJobsRouteSkipsUserAuth(t *testing.T) {
	reject := func(http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusUnauthorized) })
	}
	jobs := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Job", r.PathValue("name"))
		w.WriteHeader(http.StatusOK)
	})
	h := New(&handler.Handlers{}, &handler.SSO{}, reject, nil, func(context.Context) error { return nil }, jobs)

	cases := []struct {
		name   string
		method string
		path   string
		body   string
		want   int
	}{
		{"scheduler post", http.MethodPost, "/internal/jobs/reaper", "", http.StatusOK},
		{"get is not a job", http.MethodGet, "/internal/jobs/reaper", "", http.StatusNotFound},
		{"sso exchange skips user auth", http.MethodPost, "/api/v1/auth/sso/exchange", "{}", http.StatusBadRequest},
		{"api still authenticated", http.MethodGet, "/api/v1/me", "", http.StatusUnauthorized},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			h.ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Fatalf("status = %d, want %d", rec.Code, tc.want)
			}
		})
	}
}
