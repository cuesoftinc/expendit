package handler

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/auth"
	"github.com/cuesoftinc/expendit/api/common/internal/cache"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
)

const (
	ssoStateTTL        = 10 * time.Minute
	ssoHandoffTTL      = 5 * time.Minute
	ssoStartRateWindow = time.Minute
	ssoExchangeMaxBody = 4096

	ssoStartSourceRate    = 10
	ssoStartGlobalRate    = 600
	ssoStartSourcePending = 20
	ssoStartGlobalPending = 2000

	handoffCookieName = "expendit_oauth_handoff"

	ssoMsgStartFailed    = "Google sign-in could not be started. Please try again."
	ssoMsgRateLimited    = "Too many sign-in attempts. Please wait and try again."
	ssoMsgInvalidHandoff = "Google sign-in expired. Please try again."
	ssoMsgInvalidRequest = "The sign-in request is invalid."
	ssoMsgExchangeFailed = "Google sign-in could not be completed. Please try again."
	ssoMsgAccessDenied   = "Google sign-in was cancelled."
	ssoMsgNotRegistered  = "This Google account is not registered. Contact your administrator."
	ssoMsgMissingState   = "Google sign-in state is missing. Please try again."
	ssoMsgInvalidState   = "Google sign-in state is invalid. Please try again."
	ssoMsgExpiredState   = "Google sign-in expired. Please try again."
	ssoMsgMissingCode    = "Google did not return an authorization code. Please try again."
)

// SignIner upserts the user behind a Google identity and returns its id.
type SignIner interface {
	SignIn(ctx context.Context, id *auth.Identity) (string, error)
}

// SSOSettings is the part of config the sign-in handlers read.
type SSOSettings struct {
	RedirectURI       string
	SessionCookieName string
	OAuthStateCookie  string
	SessionTTL        time.Duration
	Secure            bool
	// FrontendURL is where the browser lands after Google; Origins are the web origins allowed to use the cookie.
	FrontendURL string
	Origins     []string
}

// SSO serves Google sign-in: start, callback, handoff exchange and logout.
type SSO struct {
	Settings SSOSettings
	Store    cache.Store
	Google   *auth.Google
	Handoffs *auth.Handoffs
	Users    SignIner
	Log      *slog.Logger
	Now      func() time.Time
}

// ssoState is the pending login kept under the state value.
type ssoState struct {
	CodeVerifier string `json:"code_verifier"`
	Challenge    string `json:"challenge"`
	SourceHash   string `json:"source_hash"`
}

type exchangeRequest struct {
	Handoff  string `json:"handoff"`
	Verifier string `json:"verifier"`
}

func (s *SSO) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (s *SSO) configured() bool {
	c := s.Settings
	return s.Google != nil && s.Google.ClientID != "" && s.Google.ClientSecret != "" && c.RedirectURI != "" && c.FrontendURL != ""
}

// GoogleLogin starts Google OAuth with a state cookie and a server-held PKCE verifier.
func (s *SSO) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if !s.configured() {
		s.startError(w, r, http.StatusServiceUnavailable, "sso_config_invalid", ssoMsgStartFailed)
		return
	}
	state, err := randomHex(16)
	if err != nil {
		s.startError(w, r, http.StatusInternalServerError, "sso_start_failed", ssoMsgStartFailed)
		return
	}
	sourceHash := sourceHashOf(r)
	allowed, err := s.Store.AllowSSOStart(r.Context(), sourceHash, state, s.now(), cache.SSOStartLimits{
		RateWindow:    ssoStartRateWindow,
		StateTTL:      ssoStateTTL,
		SourceRate:    ssoStartSourceRate,
		GlobalRate:    ssoStartGlobalRate,
		SourcePending: ssoStartSourcePending,
		GlobalPending: ssoStartGlobalPending,
	})
	if err != nil {
		s.Log.ErrorContext(r.Context(), "sso start: reserve", "error", err)
		s.startError(w, r, http.StatusServiceUnavailable, "sso_unavailable", ssoMsgStartFailed)
		return
	}
	if !allowed {
		w.Header().Set("Retry-After", "60")
		s.startError(w, r, http.StatusTooManyRequests, "rate_limited", ssoMsgRateLimited)
		return
	}
	verifier, err := randomURLToken()
	if err != nil {
		s.release(r.Context(), sourceHash, state)
		s.startError(w, r, http.StatusInternalServerError, "sso_start_failed", ssoMsgStartFailed)
		return
	}
	challenge := r.URL.Query().Get("cv")
	if !isURLToken(challenge) {
		challenge = ""
	}
	rec := ssoState{CodeVerifier: verifier, Challenge: challenge, SourceHash: sourceHash}
	if err := s.Store.Set(r.Context(), cache.SSOStateKey(state), rec, ssoStateTTL); err != nil {
		s.release(r.Context(), sourceHash, state)
		s.Log.ErrorContext(r.Context(), "sso start: store state", "error", err)
		s.startError(w, r, http.StatusServiceUnavailable, "sso_unavailable", ssoMsgStartFailed)
		return
	}
	http.SetCookie(w, s.cookie(s.Settings.OAuthStateCookie, state, int(ssoStateTTL/time.Second)))
	http.Redirect(w, r, s.Google.AuthorizeURL(s.Settings.RedirectURI, state, auth.PKCEChallengeS256(verifier)), http.StatusTemporaryRedirect)
}

// GoogleCallback verifies state, exchanges the code and hands the browser a one-time code.
func (s *SSO) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	q := r.URL.Query()
	state := q.Get("state")
	cookie, err := r.Cookie(s.Settings.OAuthStateCookie)
	switch {
	case err != nil || cookie.Value == "":
		s.loginError(w, r, "missing_state", ssoMsgMissingState)
		return
	case state == "" || state != cookie.Value:
		s.loginError(w, r, "invalid_state", ssoMsgInvalidState)
		return
	}
	http.SetCookie(w, s.cookie(s.Settings.OAuthStateCookie, "", -1))

	if e := q.Get("error"); e != "" {
		s.discardState(r.Context(), state)
		code, msg := "oauth_failed", ssoMsgExchangeFailed
		if e == "access_denied" {
			code, msg = "access_denied", ssoMsgAccessDenied
		}
		s.loginError(w, r, code, msg)
		return
	}
	if q.Get("code") == "" {
		s.discardState(r.Context(), state)
		s.loginError(w, r, "missing_code", ssoMsgMissingCode)
		return
	}
	var rec ssoState
	if err := s.Store.Take(r.Context(), cache.SSOStateKey(state), &rec); err != nil {
		s.loginError(w, r, "expired_state", ssoMsgExpiredState)
		return
	}
	s.release(r.Context(), rec.SourceHash, state)

	id, err := s.Google.ExchangeCode(r.Context(), q.Get("code"), s.Settings.RedirectURI, rec.CodeVerifier)
	if err != nil {
		s.Log.ErrorContext(r.Context(), "sso callback: exchange", "error", err)
		s.loginError(w, r, "sso_failed", ssoMsgExchangeFailed)
		return
	}
	userID, err := s.Users.SignIn(r.Context(), id)
	if err != nil {
		s.Log.ErrorContext(r.Context(), "sso callback: sign in", "error", err)
		s.loginError(w, r, "not_registered", ssoMsgNotRegistered)
		return
	}
	bodyCode, err1 := randomURLToken()
	cookieCode, err2 := randomURLToken()
	if err := errors.Join(err1, err2); err != nil {
		s.loginError(w, r, "sso_failed", ssoMsgExchangeFailed)
		return
	}
	if err := s.Handoffs.Create(r.Context(), userID, bodyCode, cookieCode, rec.Challenge, s.now().Add(ssoHandoffTTL)); err != nil {
		s.Log.ErrorContext(r.Context(), "sso callback: create handoff", "error", err)
		s.loginError(w, r, "sso_failed", ssoMsgExchangeFailed)
		return
	}
	http.SetCookie(w, s.cookie(handoffCookieName, cookieCode, int(ssoHandoffTTL/time.Second)))
	http.Redirect(w, r, s.frontend()+"/auth/callback?handoff="+url.QueryEscape(bodyCode), http.StatusFound)
}

// ExchangeSSOHandoff trades a handoff for a session: by body with the PKCE verifier, else by the handoff cookie.
func (s *SSO) ExchangeSSOHandoff(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, ssoExchangeMaxBody))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "request_too_large", ssoMsgInvalidRequest, nil)
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_body", ssoMsgInvalidRequest, nil)
		return
	}

	channel, code, verifier := auth.HandoffChannelCookie, "", ""
	if len(strings.TrimSpace(string(raw))) > 0 {
		var in exchangeRequest
		if !jsonContentType(r) || !decodeSingle(raw, &in) || !isURLToken(in.Handoff) || !isPKCEVerifier(in.Verifier) {
			writeError(w, http.StatusBadRequest, "invalid_request", ssoMsgInvalidRequest, nil)
			return
		}
		channel, code, verifier = auth.HandoffChannelBody, in.Handoff, in.Verifier
	} else {
		c, err := r.Cookie(handoffCookieName)
		if err != nil || !isURLToken(c.Value) {
			writeError(w, http.StatusUnauthorized, "handoff_invalid", ssoMsgInvalidHandoff, nil)
			return
		}
		code = c.Value
	}

	if !s.exchangeAllowed(r, channel == auth.HandoffChannelBody) {
		writeError(w, http.StatusUnauthorized, "handoff_invalid", ssoMsgInvalidHandoff, nil)
		return
	}
	token, err := s.Handoffs.Redeem(r.Context(), code, channel, verifier)
	switch {
	case errors.Is(err, auth.ErrHandoffInvalid):
		writeError(w, http.StatusUnauthorized, "handoff_invalid", ssoMsgInvalidHandoff, nil)
		return
	case err != nil:
		s.Log.ErrorContext(r.Context(), "sso exchange", "error", err)
		writeError(w, http.StatusServiceUnavailable, "sso_unavailable", ssoMsgExchangeFailed, nil)
		return
	}
	expire := s.cookie(handoffCookieName, "", -1)
	http.SetCookie(w, expire)
	http.SetCookie(w, s.sessionCookie(token, int(s.Settings.SessionTTL/time.Second)))
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "token_type": "Bearer", "expires_in": int(s.Settings.SessionTTL / time.Second)})
}

// Logout clears the session and handoff cookies. A cookie-only request must prove it came from the app.
func (s *SSO) Logout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if bearerToken(r) == "" && !s.cookieAllowed(r, true) {
		writeError(w, http.StatusForbidden, "csrf_rejected", "This request did not come from the app", nil)
		return
	}
	http.SetCookie(w, s.sessionCookie("", -1))
	http.SetCookie(w, s.cookie(handoffCookieName, "", -1))
	w.WriteHeader(http.StatusNoContent)
}

func (s *SSO) cookieAllowed(r *http.Request, needProof bool) bool {
	return middleware.CookieRequestAllowed(r, s.Settings.Origins, needProof)
}

// exchangeAllowed gates the exchange: a body carries its own proof, a cookie needs a same-site browser request.
func (s *SSO) exchangeAllowed(r *http.Request, viaBody bool) bool {
	if viaBody {
		origin := strings.TrimRight(r.Header.Get("Origin"), "/")
		return origin == "" || s.originAllowed(origin)
	}
	return s.cookieAllowed(r, true)
}

func (s *SSO) originAllowed(origin string) bool {
	for _, o := range s.Settings.Origins {
		if o == origin {
			return true
		}
	}
	return false
}

func (s *SSO) frontend() string { return strings.TrimRight(s.Settings.FrontendURL, "/") }

func (s *SSO) cookie(name, value string, maxAge int) *http.Cookie {
	c := &http.Cookie{Name: name, Value: value, Path: "/", MaxAge: maxAge, HttpOnly: true, Secure: s.Settings.Secure, SameSite: http.SameSiteLaxMode}
	if maxAge < 0 {
		c.Expires = time.Unix(1, 0)
	}
	return c
}

func (s *SSO) sessionCookie(value string, maxAge int) *http.Cookie {
	return s.cookie(s.Settings.SessionCookieName, value, maxAge)
}

func (s *SSO) release(ctx context.Context, sourceHash, state string) {
	if err := s.Store.ReleaseSSOStart(ctx, sourceHash, state); err != nil {
		s.Log.WarnContext(ctx, "sso: release reservation", "error", err)
	}
}

// discardState drops a pending login the user abandoned and frees its reservation.
func (s *SSO) discardState(ctx context.Context, state string) {
	var rec ssoState
	if err := s.Store.Take(ctx, cache.SSOStateKey(state), &rec); err == nil {
		s.release(ctx, rec.SourceHash, state)
	}
}

// startError answers a browser navigation with a redirect to the web callback page and anything else with JSON.
func (s *SSO) startError(w http.ResponseWriter, r *http.Request, status int, code, msg string) {
	if r.Header.Get("Sec-Fetch-Dest") == "document" || strings.Contains(r.Header.Get("Accept"), "text/html") {
		s.loginError(w, r, code, msg)
		return
	}
	writeError(w, status, code, msg, nil)
}

func (s *SSO) loginError(w http.ResponseWriter, r *http.Request, code, msg string) {
	q := url.Values{"error": {code}, "error_description": {msg}, "message": {msg}}
	http.Redirect(w, r, s.frontend()+"/auth/callback?"+q.Encode(), http.StatusFound)
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}

// sourceHashOf reads the X-Forwarded-For entry the front end appended; earlier entries are client-supplied.
func sourceHashOf(r *http.Request) string {
	addr := r.RemoteAddr
	if xff := strings.Join(r.Header.Values("X-Forwarded-For"), ","); strings.TrimSpace(xff) != "" {
		parts := strings.Split(xff, ",")
		addr = strings.TrimSpace(parts[len(parts)-1])
	} else if host, _, err := net.SplitHostPort(addr); err == nil {
		addr = host
	}
	return cache.SourceHash(addr)
}

func jsonContentType(r *http.Request) bool {
	mt, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mt != "application/json" {
		return false
	}
	cs, ok := params["charset"]
	return !ok || strings.EqualFold(cs, "utf-8")
}

func decodeSingle(raw []byte, v any) bool {
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()
	if dec.Decode(v) != nil {
		return false
	}
	return dec.Decode(&struct{}{}) == io.EOF
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func randomURLToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// isURLToken matches a 32-byte base64url value: the handoff codes and the PKCE challenge.
func isURLToken(s string) bool {
	if len(s) != 43 {
		return false
	}
	for _, c := range s {
		if !isURLChar(c) {
			return false
		}
	}
	return true
}

func isURLChar(c rune) bool {
	return c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-' || c == '_'
}

// isPKCEVerifier follows RFC 7636: 43 to 128 unreserved characters.
func isPKCEVerifier(s string) bool {
	if len(s) < 43 || len(s) > 128 {
		return false
	}
	for _, c := range s {
		if !isURLChar(c) && c != '.' && c != '~' {
			return false
		}
	}
	return true
}
