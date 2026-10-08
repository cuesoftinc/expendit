package middleware

import (
	"context"
	"errors"
	"net/http"

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
	SignIn(ctx context.Context, id *auth.Identity) (userID string, err error)
	// ResolveOrg returns the org and the user's role in it; an empty orgID
	// means the user's personal org. Non-members get ErrNotMember.
	ResolveOrg(ctx context.Context, userID, orgID string) (string, model.Role, error)
}

var ErrNotMember = errors.New("not a member")

type Verifier interface {
	Verify(ctx context.Context, raw string) (*auth.Identity, error)
}

// Authenticate verifies the Firebase ID token, signs the user in (creating
// their personal org on first sign-in), and resolves X-Org-Id. Cross-org
// access is 404, never 403, so org ids don't leak.
func Authenticate(v Verifier, accounts Accounts) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearer(r)
			if token == "" {
				deny(w, http.StatusUnauthorized, "unauthenticated", "Sign in to continue")
				return
			}
			id, err := v.Verify(r.Context(), token)
			switch {
			case errors.Is(err, auth.ErrExpired):
				deny(w, http.StatusUnauthorized, "token_expired", "Your session expired; sign in again")
				return
			case errors.Is(err, auth.ErrProvider):
				deny(w, http.StatusUnauthorized, "unauthenticated", err.Error())
				return
			case err != nil:
				deny(w, http.StatusUnauthorized, "unauthenticated", "Sign in to continue")
				return
			}
			userID, err := accounts.SignIn(r.Context(), id)
			if err != nil {
				deny(w, http.StatusInternalServerError, "internal", "Something went wrong")
				return
			}
			orgID, role, err := accounts.ResolveOrg(r.Context(), userID, r.Header.Get("X-Org-Id"))
			if errors.Is(err, ErrNotMember) {
				deny(w, http.StatusNotFound, "not_found", "Not found")
				return
			} else if err != nil {
				deny(w, http.StatusInternalServerError, "internal", "Something went wrong")
				return
			}
			ctx := WithPrincipal(r.Context(), &Principal{UserID: userID, Email: id.Email, OrgID: orgID, Role: role})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func deny(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"error":{"code":"` + code + `","message":"` + message + `","details":{}}}`))
}
