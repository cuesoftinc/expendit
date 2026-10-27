package auth

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
)

type memoryHandoffStore struct {
	mu              sync.Mutex
	handoff         *Handoff
	bodyHash        string
	cookieHash      string
	failPersistOnce bool
}

func (s *memoryHandoffStore) Create(_ context.Context, h NewHandoff) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handoff = &Handoff{UserID: h.UserID, Email: "user@example.com", Challenge: h.Challenge, ExpiresAt: h.ExpiresAt}
	s.bodyHash, s.cookieHash = h.BodyCodeHash, h.CookieCodeHash
	return nil
}

func (*memoryHandoffStore) DeleteExpired(context.Context, time.Time, int) error { return nil }

func (s *memoryHandoffStore) WithLocked(_ context.Context, codeHash, channel string, fn func(*Handoff) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	want := s.cookieHash
	if channel == HandoffChannelBody {
		want = s.bodyHash
	}
	if s.handoff == nil || !s.handoff.ExpiresAt.After(time.Now()) || codeHash != want {
		return ErrHandoffNotFound
	}
	working := *s.handoff
	working.TokenCiphertext = append([]byte(nil), s.handoff.TokenCiphertext...)
	if err := fn(&working); err != nil {
		return err
	}
	if s.failPersistOnce {
		s.failPersistOnce = false
		return errors.New("injected durable write failure")
	}
	s.handoff = &working
	return nil
}

func testHandoffs(t *testing.T) (*Handoffs, *memoryHandoffStore) {
	t.Helper()
	store := &memoryHandoffStore{}
	h := NewHandoffs(store, NewTokens("0123456789abcdef0123456789abcdef", time.Hour), "session-secret", nil)
	return h, store
}

func seed(t *testing.T, h *Handoffs, verifier string, ttl time.Duration) {
	t.Helper()
	challenge := ""
	if verifier != "" {
		challenge = PKCEChallengeS256(verifier)
	}
	if err := h.Create(context.Background(), "user-1", "body-code", "cookie-code", challenge, time.Now().Add(ttl)); err != nil {
		t.Fatal(err)
	}
}

func TestRedeemBodyChannelNeedsTheVerifier(t *testing.T) {
	h, _ := testHandoffs(t)
	seed(t, h, "verifier-one", 5*time.Minute)
	ctx := context.Background()

	if _, err := h.Redeem(ctx, "body-code", HandoffChannelBody, "wrong"); !errors.Is(err, ErrHandoffInvalid) {
		t.Fatalf("wrong verifier error = %v", err)
	}
	if _, err := h.Redeem(ctx, "body-code", HandoffChannelBody, ""); !errors.Is(err, ErrHandoffInvalid) {
		t.Fatalf("empty verifier error = %v", err)
	}
	token, err := h.Redeem(ctx, "body-code", HandoffChannelBody, "verifier-one")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := h.tokens.Parse(token)
	if err != nil || claims.Subject != "user-1" || claims.Email != "user@example.com" {
		t.Fatalf("claims = %+v, %v", claims, err)
	}
}

func TestRedeemReplayReturnsTheSameTokenOnTheSameChannelOnly(t *testing.T) {
	h, _ := testHandoffs(t)
	seed(t, h, "", 5*time.Minute)
	ctx := context.Background()

	first, err := h.Redeem(ctx, "cookie-code", HandoffChannelCookie, "")
	if err != nil {
		t.Fatal(err)
	}
	second, err := h.Redeem(ctx, "cookie-code", HandoffChannelCookie, "")
	if err != nil || second != first {
		t.Fatalf("replay = %q, %v; want %q", second, err, first)
	}
	if _, err := h.Redeem(ctx, "body-code", HandoffChannelBody, "x"); !errors.Is(err, ErrHandoffInvalid) {
		t.Fatalf("other channel after redeem error = %v", err)
	}
}

func TestRedeemStorageFailureNeverReturnsAnUnrecordedToken(t *testing.T) {
	h, store := testHandoffs(t)
	seed(t, h, "", 5*time.Minute)
	store.failPersistOnce = true

	token, err := h.Redeem(context.Background(), "cookie-code", HandoffChannelCookie, "")
	if err == nil && token == "" {
		t.Fatal("expected the failed write to surface")
	}
	if err == nil {
		t.Fatalf("failed durable write returned token %q", token)
	}
	if len(store.handoff.TokenCiphertext) != 0 || store.handoff.Channel != "" {
		t.Fatal("failed transaction persisted a completed handoff")
	}
	if _, err := h.Redeem(context.Background(), "cookie-code", HandoffChannelCookie, ""); err != nil {
		t.Fatalf("retry after failed write: %v", err)
	}
}

func TestRedeemReplayWindowIsBounded(t *testing.T) {
	h, store := testHandoffs(t)
	seed(t, h, "", 5*time.Minute)
	started := time.Now()

	if _, err := h.Redeem(context.Background(), "cookie-code", HandoffChannelCookie, ""); err != nil {
		t.Fatal(err)
	}
	if store.handoff.ExpiresAt.After(started.Add(handoffReplayTTL+time.Second)) || !store.handoff.ExpiresAt.After(started) {
		t.Fatalf("replay expiry = %s", store.handoff.ExpiresAt)
	}
}

func TestRedeemUnknownCodeIsInvalid(t *testing.T) {
	h, _ := testHandoffs(t)
	seed(t, h, "", time.Minute)
	if _, err := h.Redeem(context.Background(), "nope", HandoffChannelCookie, ""); !errors.Is(err, ErrHandoffInvalid) {
		t.Fatalf("unknown code error = %v", err)
	}
}

func TestTokensRejectTamperingAndExpiry(t *testing.T) {
	tokens := NewTokens("0123456789abcdef0123456789abcdef", time.Hour)
	token, err := tokens.Issue("u", "e@example.com", time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tokens.Parse(token + "x"); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("tampered token error = %v", err)
	}
	other := NewTokens("ffffffffffffffffffffffffffffffff", time.Hour)
	if _, err := other.Parse(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("wrong secret error = %v", err)
	}
	old, _ := tokens.Issue("u", "e@example.com", time.Now().Add(-3*time.Hour))
	if _, err := tokens.Parse(old); !errors.Is(err, ErrExpired) {
		t.Fatalf("expired token error = %v", err)
	}
}

func TestAuthorizeURLCarriesPKCE(t *testing.T) {
	u := NewGoogle("cid", "secret").AuthorizeURL("https://app.example/cb", "st", "ch")
	for _, want := range []string{"client_id=cid", "state=st", "code_challenge=ch", "code_challenge_method=S256", "redirect_uri=https%3A%2F%2Fapp.example%2Fcb"} {
		if !contains(u, want) {
			t.Errorf("authorize url missing %q: %s", want, u)
		}
	}
}

func contains(s, sub string) bool { return strings.Contains(s, sub) }
