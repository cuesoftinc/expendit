package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/auth"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
)

type fakeAccounts struct{ err error }

func (f fakeAccounts) ResolveOrg(_ context.Context, userID, orgID string) (string, model.Role, error) {
	if f.err != nil {
		return "", "", f.err
	}
	if orgID == "" {
		orgID = "org-" + userID
	}
	return orgID, model.Role("owner"), nil
}

func TestAuthenticateSessions(t *testing.T) {
	tokens := auth.NewTokens("0123456789abcdef0123456789abcdef", time.Hour)
	good, err := tokens.Issue("user-1", "a@x.io", time.Now())
	if err != nil {
		t.Fatal(err)
	}
	expired, err := tokens.Issue("user-1", "a@x.io", time.Now().Add(-2*time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	session := Session{Tokens: tokens, CookieName: "sess", Origins: []string{"https://app.example.com"}}

	cases := []struct {
		name     string
		method   string
		accounts Accounts
		setup    func(r *http.Request)
		want     int
	}{
		{"no credentials", http.MethodGet, fakeAccounts{}, func(*http.Request) {}, http.StatusUnauthorized},
		{"bearer", http.MethodGet, fakeAccounts{}, func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+good) }, http.StatusOK},
		{"bearer garbage", http.MethodGet, fakeAccounts{}, func(r *http.Request) { r.Header.Set("Authorization", "Bearer nope") }, http.StatusUnauthorized},
		{"bearer expired", http.MethodGet, fakeAccounts{}, func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+expired) }, http.StatusUnauthorized},
		{"cookie get", http.MethodGet, fakeAccounts{}, func(r *http.Request) { r.AddCookie(&http.Cookie{Name: "sess", Value: good}) }, http.StatusOK},
		{"cookie post same origin", http.MethodPost, fakeAccounts{}, func(r *http.Request) {
			r.AddCookie(&http.Cookie{Name: "sess", Value: good})
			r.Header.Set("Origin", "https://app.example.com")
		}, http.StatusOK},
		{"cookie post without origin", http.MethodPost, fakeAccounts{}, func(r *http.Request) { r.AddCookie(&http.Cookie{Name: "sess", Value: good}) }, http.StatusForbidden},
		{"cookie post foreign origin", http.MethodPost, fakeAccounts{}, func(r *http.Request) {
			r.AddCookie(&http.Cookie{Name: "sess", Value: good})
			r.Header.Set("Origin", "https://evil.example")
		}, http.StatusForbidden},
		{"cookie cross-site fetch", http.MethodGet, fakeAccounts{}, func(r *http.Request) {
			r.AddCookie(&http.Cookie{Name: "sess", Value: good})
			r.Header.Set("Sec-Fetch-Site", "cross-site")
		}, http.StatusForbidden},
		{"not a member", http.MethodGet, fakeAccounts{err: ErrNotMember}, func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+good) }, http.StatusNotFound},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var got *Principal
			h := Authenticate(session, tc.accounts)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { got = PrincipalFrom(r.Context()) }))
			req := httptest.NewRequest(tc.method, "/api/v1/me", nil)
			tc.setup(req)
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Fatalf("status = %d, want %d", rec.Code, tc.want)
			}
			if tc.want == http.StatusOK && (got == nil || got.UserID != "user-1" || got.Email != "a@x.io") {
				t.Fatalf("principal = %+v", got)
			}
		})
	}
}
