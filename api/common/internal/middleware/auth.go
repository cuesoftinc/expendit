package middleware

import (
	"context"
	"errors"
	"net/http"
	"slices"
	"strings"

	"github.com/cuesoftinc/expendit/api/common/internal/auth"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
)

// Principal is resolved once per request: {user, org, role} (engineering.md §2).
type Principal struct {
	UserID string
	Email  string
	OrgID  string
	Role   model.Role
}

const principalKey ctxKey = 100

func PrincipalFrom(ctx context.Context) *Principal {
	p, _ := ctx.Value(principalKey).(*Principal)
	return p
}

func WithPrincipal(ctx context.Context, p *Principal) context.Context {
	return context.WithValue(ctx, principalKey, p)
}

// Accounts is the slice of the identity service auth needs.
type Accounts interface {
	// ResolveOrg returns the org and the user's role in it; an empty orgID
	// means the user's personal org. Non-members get ErrNotMember.
	ResolveOrg(ctx context.Context, userID, orgID string) (string, model.Role, error)
}

var ErrNotMember = errors.New("not a member")

// Session is how a request proves who it is: a bearer session token, else
// the session cookie.
type Session struct {
	Tokens     *auth.Tokens
	CookieName string
	// Origins are the web origins allowed to send cookie-authenticated requests.
	Origins []string
}

// Authenticate validates the session token and resolves X-Org-Id. Cross-org
// access is 404, never 403, so org ids don't leak.
func Authenticate(s Session, accounts Accounts) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearer(r)
			if token == "" {
				if c, err := r.Cookie(s.CookieName); err == nil {
					token = c.Value
					if !CookieRequestAllowed(r, s.Origins, !safeMethod(r.Method)) {
						deny(w, http.StatusForbidden, "csrf_rejected", "This request did not come from the app")
						return
					}
				}
			}
			if token == "" {
				deny(w, http.StatusUnauthorized, "unauthenticated", "Sign in to continue")
				return
			}
			claims, err := s.Tokens.Parse(token)
			switch {
			case errors.Is(err, auth.ErrExpired):
				deny(w, http.StatusUnauthorized, "token_expired", "Your session expired; sign in again")
				return
			case err != nil:
				deny(w, http.StatusUnauthorized, "unauthenticated", "Sign in to continue")
				return
			}
			orgID, role, err := accounts.ResolveOrg(r.Context(), claims.Subject, r.Header.Get("X-Org-Id"))
			if errors.Is(err, ErrNotMember) {
				deny(w, http.StatusNotFound, "not_found", "Not found")
				return
			} else if err != nil {
				deny(w, http.StatusInternalServerError, "internal", "Something went wrong")
				return
			}
			ctx := WithPrincipal(r.Context(), &Principal{UserID: claims.Subject, Email: claims.Email, OrgID: orgID, Role: role})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// CookieRequestAllowed guards requests that carry only a cookie: a present
// Origin must be one of origins, a cross-site fetch is refused, and with
// needProof a request with no Origin must at least be same-origin.
func CookieRequestAllowed(r *http.Request, origins []string, needProof bool) bool {
	origin := strings.TrimRight(r.Header.Get("Origin"), "/")
	if origin != "" && !slices.Contains(origins, origin) {
		return false
	}
	fetchSite := r.Header.Get("Sec-Fetch-Site")
	switch fetchSite {
	case "", "same-origin", "same-site":
	default:
		return false
	}
	return !needProof || origin != "" || fetchSite == "same-origin"
}

func safeMethod(m string) bool {
	return m == http.MethodGet || m == http.MethodHead || m == http.MethodOptions
}

func deny(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"error":{"code":"` + code + `","message":"` + message + `","details":{}}}`))
}
