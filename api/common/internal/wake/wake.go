// Package wake starts a scaled-to-zero service so its Kafka consumers run
// (system-design.md §16 I-16). Cloud Run starts an instance only for an HTTP
// request, so after publishing for a service we send it one: GET /health.
// The instance then consumes in the background (CPU always allocated) until
// it has been idle long enough for Cloud Run to stop it.
//
// Waking is best-effort: a missed wake leaves the message in Kafka, and the
// reaper job wakes the services again while work is pending.
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

// debounce skips a wake when the same service was woken this recently: an
// instance that answered a request moments ago is still up.
const debounce = 10 * time.Second

const metadataIdentity = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity"

type Waker struct {
	client *http.Client
	// idTokens: on Cloud Run, sign each wake with the service account's ID
	// token, because the analytics services only accept authenticated calls.
	idTokens bool

	mu   sync.Mutex
	last map[string]time.Time
}

// New returns a Waker. On Cloud Run (a service sets K_SERVICE, a job
// CLOUD_RUN_JOB) wakes carry an ID token for the target; elsewhere they go
// out unauthenticated.
func New() *Waker {
	return &Waker{
		client:   &http.Client{Timeout: 30 * time.Second},
		idTokens: os.Getenv("K_SERVICE") != "" || os.Getenv("CLOUD_RUN_JOB") != "",
		last:     map[string]time.Time{},
	}
}

// Async wakes base in the background. An empty base (compose, Helm: the
// services always run) does nothing.
func (w *Waker) Async(base, reason string) {
	if base == "" || !w.due(base) {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_ = w.Now(ctx, base, reason)
	}()
}

// Now wakes base and waits for the answer.
func (w *Waker) Now(ctx context.Context, base, reason string) error {
	if base == "" {
		return nil
	}
	err := w.call(ctx, strings.TrimRight(base, "/"))
	if err != nil {
		w.forget(base)
		slog.Warn("wake failed", "step", "wake", "target", host(base), "reason", reason, "error", err)
		return err
	}
	slog.Info("woke service", "step", "wake", "target", host(base), "reason", reason)
	return nil
}

func (w *Waker) due(base string) bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	if time.Since(w.last[base]) < debounce {
		return false
	}
	w.last[base] = time.Now()
	return true
}

func (w *Waker) forget(base string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	delete(w.last, base)
}

func (w *Waker) call(ctx context.Context, base string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/health", nil)
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
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		metadataIdentity+"?audience="+url.QueryEscape(audience), nil)
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
