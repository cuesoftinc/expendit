// Package wake settles a scaled-to-zero service so its Kafka consumers run
// (system-design.md §16 I-16). Cloud Run allocates CPU only while a request is
// open, so a GET /health starts an instance but its consumers stall once the
// answer is sent. Settle is a POST to /internal/settle that the target answers
// only after it has handled what is waiting for it.
//
// Settle is awaited inside the request that caused it and is best-effort: a
// missed settle leaves the message in Kafka, and the reaper job settles the
// services again while work is pending.
package wake

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// settleTimeout covers a cold start, a consumer-group join and the target's
// own settle budget.
const settleTimeout = 45 * time.Second

const metadataIdentity = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity"

type Waker struct {
	client *http.Client
	// idTokens: on Cloud Run, sign each call with the service account's ID
	// token, because the services only accept authenticated calls.
	idTokens bool
	identity string
}

// New returns a Waker. On Cloud Run (a service sets K_SERVICE, a job
// CLOUD_RUN_JOB) calls carry an ID token for the target; elsewhere they go
// out unauthenticated.
func New() *Waker {
	return &Waker{
		client:   &http.Client{},
		idTokens: os.Getenv("K_SERVICE") != "" || os.Getenv("CLOUD_RUN_JOB") != "",
		identity: metadataIdentity,
	}
}

// Settle asks base to handle everything waiting for it and waits for its
// answer. An empty base (compose, Helm: the services always run) does nothing.
func (w *Waker) Settle(ctx context.Context, base, reason string) error {
	if base == "" {
		return nil
	}
	base = strings.TrimRight(base, "/")
	ctx, cancel := context.WithTimeout(ctx, settleTimeout)
	defer cancel()
	err := w.settle(ctx, base)
	if err != nil {
		slog.Warn("settle failed", "step", "settle", "target", host(base), "reason", reason, "error", err)
		return err
	}
	slog.Info("settled service", "step", "settle", "target", host(base), "reason", reason)
	return nil
}

// SettleAll settles every distinct non-empty base at once and returns when all
// have answered.
func (w *Waker) SettleAll(ctx context.Context, reason string, bases ...string) {
	var wg sync.WaitGroup
	seen := map[string]bool{}
	for _, base := range bases {
		if base == "" || seen[base] {
			continue
		}
		seen[base] = true
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = w.Settle(ctx, base, reason)
		}()
	}
	wg.Wait()
}

func (w *Waker) settle(ctx context.Context, base string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/internal/settle", nil)
	if err != nil {
		return err
	}
	if w.idTokens {
		token, err := w.idToken(ctx, base)
		if err != nil {
			return fmt.Errorf("id token: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := w.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	_, _ = io.Copy(io.Discard, res.Body)
	if res.StatusCode >= 300 {
		return fmt.Errorf("status %d", res.StatusCode)
	}
	return nil
}

// idToken asks the metadata server for an ID token whose audience is the
// target service's URL, which is what Cloud Run checks.
func (w *Waker) idToken(ctx context.Context, audience string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, w.identity+"?audience="+url.QueryEscape(audience), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Metadata-Flavor", "Google")
	res, err := w.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 64<<10))
	if err != nil {
		return "", err
	}
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("metadata status %d", res.StatusCode)
	}
	return strings.TrimSpace(string(body)), nil
}

// host keeps logs readable: the service host, never a query string.
func host(base string) string {
	if u, err := url.Parse(base); err == nil && u.Host != "" {
		return u.Host
	}
	return base
}
