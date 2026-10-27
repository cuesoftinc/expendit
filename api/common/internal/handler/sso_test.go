package handler

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/auth"
	"github.com/cuesoftinc/expendit/api/common/internal/cache"
)

func newSSO() *SSO {
	return &SSO{
		Settings: SSOSettings{
			RedirectURI:       "https://app.example.com/api/v1/auth/sso/google/callback",
			SessionCookieName: "sess",
			OAuthStateCookie:  "oauth_state",
			SessionTTL:        time.Hour,
			Secure:            true,
			FrontendURL:       "https://app.example.com",
			Origins:           []string{"https://app.example.com"},
		},
		Store:  cache.NewMemoryStore(),
		Google: auth.NewGoogle("client", "secret"),
		Log:    slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func cookieNamed(rec *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range rec.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

func TestGoogleLoginRedirectsWithStateCookieAndPKCE(t *testing.T) {
	s := newSSO()
	rec := httptest.NewRecorder()
	s.GoogleLogin(rec, httptest.NewRequest(http.MethodGet, "/api/v1/auth/sso/google?cv="+strings.Repeat("c", 43), nil))

	if rec.Code != http.StatusTemporaryRedirect {
		t.Fatalf("status = %d", rec.Code)
	}
	loc, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatal(err)
	}
	q := loc.Query()
	if q.Get("code_challenge_method") != "S256" || q.Get("code_challenge") == "" || q.Get("state") == "" {
		t.Fatalf("authorize url = %s", loc)
	}
	c := cookieNamed(rec, "oauth_state")
	if c == nil || c.Value != q.Get("state") || !c.HttpOnly || !c.Secure || c.MaxAge != 600 || c.SameSite != http.SameSiteLaxMode {
		t.Fatalf("state cookie = %+v", c)
	}
	if rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("login must not be cacheable")
	}
}

func TestGoogleLoginDropsANonCanonicalChallenge(t *testing.T) {
	s := newSSO()
	rec := httptest.NewRecorder()
	s.GoogleLogin(rec, httptest.NewRequest(http.MethodGet, "/x?cv=short", nil))
	state := cookieNamed(rec, "oauth_state").Value

	var got ssoState
	if err := s.Store.Take(t.Context(), cache.SSOStateKey(state), &got); err != nil {
		t.Fatal(err)
	}
	if got.Challenge != "" || got.CodeVerifier == "" {
		t.Fatalf("state = %+v", got)
	}
}

func TestGoogleLoginRateLimitsBySource(t *testing.T) {
	s := newSSO()
	var last *httptest.ResponseRecorder
	for i := 0; i <= ssoStartSourceRate; i++ {
		last = httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		req.RemoteAddr = "203.0.113.9:4000"
		s.GoogleLogin(last, req)
	}
	if last.Code != http.StatusTooManyRequests || last.Header().Get("Retry-After") != "60" {
		t.Fatalf("status = %d, retry-after = %q", last.Code, last.Header().Get("Retry-After"))
	}
}

func TestGoogleLoginNeedsConfig(t *testing.T) {
	s := newSSO()
	s.Settings.FrontendURL = ""

	api := httptest.NewRecorder()
	s.GoogleLogin(api, httptest.NewRequest(http.MethodGet, "/x", nil))
	if api.Code != http.StatusServiceUnavailable {
		t.Fatalf("api status = %d", api.Code)
	}

	browser := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Accept", "text/html")
	s.Settings.FrontendURL = "https://app.example.com"
	s.Google = nil
	s.GoogleLogin(browser, req)
	if browser.Code != http.StatusFound || !strings.Contains(browser.Header().Get("Location"), "error=sso_config_invalid") {
		t.Fatalf("browser = %d %s", browser.Code, browser.Header().Get("Location"))
	}
}

func TestGoogleCallbackRejectsBadState(t *testing.T) {
	s := newSSO()
	cases := []struct {
		name, target, cookie, want string
	}{
		{"no cookie", "/cb?state=a&code=c", "", "missing_state"},
		{"mismatch", "/cb?state=a&code=c", "b", "invalid_state"},
		{"unknown state", "/cb?state=a&code=c", "a", "expired_state"},
		{"cancelled", "/cb?state=a&error=access_denied", "a", "access_denied"},
		{"other error", "/cb?state=a&error=server_error", "a", "oauth_failed"},
		{"no code", "/cb?state=a", "a", "missing_code"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, tc.target, nil)
			if tc.cookie != "" {
				req.AddCookie(&http.Cookie{Name: "oauth_state", Value: tc.cookie})
			}
			s.GoogleCallback(rec, req)
			loc := rec.Header().Get("Location")
			if rec.Code != http.StatusFound || !strings.HasPrefix(loc, "https://app.example.com/auth/callback?") || !strings.Contains(loc, "error="+tc.want) {
				t.Fatalf("got %d %s", rec.Code, loc)
			}
		})
	}
}

func TestExchangeRejectsMalformedRequests(t *testing.T) {
	s := newSSO()
	good := `{"handoff":"` + strings.Repeat("h", 43) + `","verifier":"` + strings.Repeat("v", 43) + `"}`
	cases := []struct {
		name, body, ctype, origin string
		want                      int
	}{
		{"no body and no cookie", "", "", "", http.StatusUnauthorized},
		{"wrong content type", good, "text/plain", "", http.StatusBadRequest},
		{"unknown field", `{"handoff":"x","verifier":"y","extra":1}`, "application/json", "", http.StatusBadRequest},
		{"short handoff", `{"handoff":"x","verifier":"` + strings.Repeat("v", 43) + `"}`, "application/json", "", http.StatusBadRequest},
		{"two values", good + good, "application/json", "", http.StatusBadRequest},
		{"foreign origin", good, "application/json", "https://evil.example", http.StatusUnauthorized},
		{"too large", strings.Repeat("a", ssoExchangeMaxBody+1), "application/json", "", http.StatusRequestEntityTooLarge},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(tc.body))
			if tc.ctype != "" {
				req.Header.Set("Content-Type", tc.ctype)
			}
			if tc.origin != "" {
				req.Header.Set("Origin", tc.origin)
			}
			s.ExchangeSSOHandoff(rec, req)
			if rec.Code != tc.want {
				t.Fatalf("status = %d, want %d", rec.Code, tc.want)
			}
		})
	}
}

func TestLogoutClearsCookiesAndGuardsTheCookieChannel(t *testing.T) {
	s := newSSO()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/x", nil)
	req.Header.Set("Origin", "https://app.example.com")
	s.Logout(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d", rec.Code)
	}
	if c := cookieNamed(rec, "sess"); c == nil || c.MaxAge >= 0 {
		t.Fatalf("session cookie not cleared: %+v", c)
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/x", nil)
	req.Header.Set("Origin", "https://evil.example")
	s.Logout(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-origin status = %d", rec.Code)
	}
}

func TestTokenShapes(t *testing.T) {
	if !isURLToken(strings.Repeat("a", 43)) || isURLToken(strings.Repeat("a", 42)) || isURLToken(strings.Repeat("a", 42)+"=") {
		t.Fatal("url token shape")
	}
	if !isPKCEVerifier(strings.Repeat("a", 43)+".~") || isPKCEVerifier(strings.Repeat("a", 42)) || isPKCEVerifier(strings.Repeat("a", 129)) {
		t.Fatal("pkce verifier shape")
	}
}
