package middleware

import (
	"context"
	"log/slog"
	"net/http"

	"google.golang.org/api/idtoken"
)

// SchedulerClaims are the verified claims the guard reads.
type SchedulerClaims struct {
	Email         string
	EmailVerified bool
}

// SchedulerVerifier checks a Google OIDC token for an audience.
type SchedulerVerifier interface {
	Verify(ctx context.Context, token, audience string) (SchedulerClaims, error)
}

// GoogleVerifier validates signature, issuer, expiry and audience with Google's keys.
type GoogleVerifier struct{}

func (GoogleVerifier) Verify(ctx context.Context, token, audience string) (SchedulerClaims, error) {
	p, err := idtoken.Validate(ctx, token, audience)
	if err != nil {
		return SchedulerClaims{}, err
	}
	email, _ := p.Claims["email"].(string)
	verified, _ := p.Claims["email_verified"].(bool)
	return SchedulerClaims{Email: email, EmailVerified: verified}, nil
}

// SchedulerAuth admits only Cloud Scheduler's OIDC token: audience and invoker
// email come from config, and either unset fails closed with 503.
func SchedulerAuth(v SchedulerVerifier, audience, invokerEmail string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if audience == "" || invokerEmail == "" {
				slog.ErrorContext(r.Context(), "scheduler auth not configured")
				deny(w, http.StatusServiceUnavailable, "unavailable", "Scheduler auth is not configured")
				return
			}
			token := bearer(r)
			if token == "" {
				deny(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
				return
			}
			claims, err := v.Verify(r.Context(), token, audience)
			if err != nil {
				slog.WarnContext(r.Context(), "scheduler token rejected", "error", err)
				deny(w, http.StatusUnauthorized, "unauthorized", "Invalid token")
				return
			}
			if !claims.EmailVerified || claims.Email != invokerEmail {
				slog.WarnContext(r.Context(), "scheduler token rejected: caller is not the invoker")
				deny(w, http.StatusForbidden, "forbidden", "Caller is not allowed")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
