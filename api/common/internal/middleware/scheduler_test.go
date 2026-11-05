package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeVerifier struct {
	claims   SchedulerClaims
	err      error
	audience string
}

func (f *fakeVerifier) Verify(_ context.Context, _, audience string) (SchedulerClaims, error) {
	f.audience = audience
	return f.claims, f.err
}

func TestSchedulerAuth(t *testing.T) {
	const invoker = "scheduler@proj.iam.gserviceaccount.com"
	cases := []struct {
		name     string
		audience string
		email    string
		header   string
		verifier *fakeVerifier
		want     int
	}{
		{"audience unset", "", invoker, "Bearer t", &fakeVerifier{}, http.StatusServiceUnavailable},
		{"invoker unset", "https://svc", "", "Bearer t", &fakeVerifier{}, http.StatusServiceUnavailable},
		{"no header", "https://svc", invoker, "", &fakeVerifier{}, http.StatusUnauthorized},
		{"not bearer", "https://svc", invoker, "Basic t", &fakeVerifier{}, http.StatusUnauthorized},
		{"bad token", "https://svc", invoker, "Bearer t", &fakeVerifier{err: errors.New("bad")}, http.StatusUnauthorized},
		{"wrong email", "https://svc", invoker, "Bearer t", &fakeVerifier{claims: SchedulerClaims{Email: "other@x.io", EmailVerified: true}}, http.StatusForbidden},
		{"email unverified", "https://svc", invoker, "Bearer t", &fakeVerifier{claims: SchedulerClaims{Email: invoker}}, http.StatusForbidden},
		{"invoker", "https://svc", invoker, "Bearer t", &fakeVerifier{claims: SchedulerClaims{Email: invoker, EmailVerified: true}}, http.StatusOK},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
			h := SchedulerAuth(tc.verifier, tc.audience, tc.email)(next)
			req := httptest.NewRequest(http.MethodPost, "/internal/jobs/reaper", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Fatalf("status = %d, want %d", rec.Code, tc.want)
			}
			if tc.want == http.StatusOK && tc.verifier.audience != tc.audience {
				t.Fatalf("verified against %q, want %q", tc.verifier.audience, tc.audience)
			}
		})
	}
}

func TestInternalAuthAdmitsEveryListedInvoker(t *testing.T) {
	const scheduler, statements = "scheduler@p.iam.gserviceaccount.com", "statements@p.iam.gserviceaccount.com"
	cases := []struct {
		name     string
		audience string
		invokers []string
		email    string
		want     int
	}{
		{"audience unset", "", []string{scheduler}, scheduler, http.StatusServiceUnavailable},
		{"no invokers", "https://svc", []string{""}, scheduler, http.StatusServiceUnavailable},
		{"first invoker", "https://svc", []string{scheduler, statements}, scheduler, http.StatusOK},
		{"second invoker", "https://svc", []string{scheduler, statements}, statements, http.StatusOK},
		{"stranger", "https://svc", []string{scheduler, statements}, "other@x.io", http.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			v := &fakeVerifier{claims: SchedulerClaims{Email: tc.email, EmailVerified: true}}
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
			req := httptest.NewRequest(http.MethodPost, "/internal/settle", nil)
			req.Header.Set("Authorization", "Bearer t")
			rec := httptest.NewRecorder()
			InternalAuth(v, tc.audience, tc.invokers...)(next).ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Fatalf("status = %d, want %d", rec.Code, tc.want)
			}
		})
	}
}
