package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"slices"

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
	return guard(v, audience, []string{invokerEmail}, "Scheduler auth is not configured")
}

// InternalAuth admits a Google ID token for audience whose verified email is
// one of invokers; an unset audience or an empty list fails closed with 503.
func InternalAuth(v SchedulerVerifier, audience string, invokers ...string) func(http.Handler) http.Handler {
	return guard(v, audience, invokers, "Internal auth is not configured")
}

func guard(v SchedulerVerifier, audience string, invokers []string, unconfigured string) func(http.Handler) http.Handler {
	allowed := make([]string, 0, len(invokers))
	for _, email := range invokers {
		if email != "" {
			allowed = append(allowed, email)
		}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if audience == "" || len(allowed) == 0 {
				slog.ErrorContext(r.Context(), "caller auth not configured", "route", r.URL.Path)
				deny(w, http.StatusServiceUnavailable, "unavailable", unconfigured)
				return
			}
			token := bearer(r)
			if token == "" {
				deny(w, http.StatusUnauthorized, "unauthorized", "Missing bearer token")
				return
			}
			claims, err := v.Verify(r.Context(), token, audience)
			if err != nil {
				slog.WarnContext(r.Context(), "caller token rejected", "route", r.URL.Path, "error", err)
				deny(w, http.StatusUnauthorized, "unauthorized", "Invalid token")
				return
			}
			if !claims.EmailVerified || !slices.Contains(allowed, claims.Email) {
				slog.WarnContext(r.Context(), "caller token rejected: caller is not an invoker", "route", r.URL.Path)
				deny(w, http.StatusForbidden, "forbidden", "Caller is not allowed")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
