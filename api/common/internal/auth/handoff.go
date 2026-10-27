package auth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"time"
)

const (
	HandoffChannelBody   = "body"
	HandoffChannelCookie = "cookie"
	handoffReplayTTL     = time.Minute
	handoffPruneBatch    = 100
)

var (
	ErrHandoffInvalid  = errors.New("sso handoff missing, expired, or unusable")
	ErrHandoffNotFound = errors.New("sso handoff not found")
)

// Handoff is the durable record behind a one-time sign-in code. The codes
// themselves are never stored, only their hashes.
type Handoff struct {
	UserID          string
	Email           string
	Challenge       string
	Channel         string
	TokenCiphertext []byte
	ConsumedAt      *time.Time
	ExpiresAt       time.Time
}

// NewHandoff is a handoff about to be stored.
type NewHandoff struct {
	BodyCodeHash   string
	CookieCodeHash string
	UserID         string
	Challenge      string
	ExpiresAt      time.Time
}

type HandoffStore interface {
	Create(ctx context.Context, h NewHandoff) error
	// WithLocked runs fn on the unexpired handoff for codeHash under a row
	// lock and persists fn's changes only when it returns nil; a missing
	// row is ErrHandoffNotFound.
	WithLocked(ctx context.Context, codeHash, channel string, fn func(*Handoff) error) error
	DeleteExpired(ctx context.Context, now time.Time, limit int) error
}

// Handoffs creates and redeems sign-in handoffs.
type Handoffs struct {
	store    HandoffStore
	tokens   *Tokens
	sealKey  [sha256.Size]byte
	log      *slog.Logger
	newToken func(userID, email string, now time.Time) (string, error)
	nowFunc  func() time.Time
}

func NewHandoffs(store HandoffStore, tokens *Tokens, sessionSecret string, log *slog.Logger) *Handoffs {
	return &Handoffs{
		store:    store,
		tokens:   tokens,
		sealKey:  sha256.Sum256([]byte(sessionSecret)),
		log:      log,
		newToken: tokens.Issue,
		nowFunc:  time.Now,
	}
}

func (h *Handoffs) Create(ctx context.Context, userID, bodyCode, cookieCode, challenge string, expiresAt time.Time) error {
	if err := h.store.DeleteExpired(ctx, h.nowFunc(), handoffPruneBatch); err != nil && h.log != nil {
		h.log.Warn("failed to prune expired SSO handoffs", "error", err)
	}
	return h.store.Create(ctx, NewHandoff{
		BodyCodeHash:   HashHandoffCode(bodyCode),
		CookieCodeHash: HashHandoffCode(cookieCode),
		UserID:         userID,
		Challenge:      challenge,
		ExpiresAt:      expiresAt,
	})
}

// Redeem exchanges a handoff code for the session token. The first redeem
// issues and seals the token; replays inside the window return the same one.
func (h *Handoffs) Redeem(ctx context.Context, code, channel, verifier string) (string, error) {
	var token string
	codeHash := HashHandoffCode(code)
	aad := []byte(channel + ":" + codeHash)
	err := h.store.WithLocked(ctx, codeHash, channel, func(hf *Handoff) error {
		if channel == HandoffChannelBody && !verifierMatchesChallenge(verifier, hf.Challenge) {
			return ErrHandoffInvalid
		}
		if hf.Channel != "" && hf.Channel != channel {
			return ErrHandoffInvalid
		}
		if len(hf.TokenCiphertext) > 0 {
			t, err := h.open(hf.TokenCiphertext, aad)
			if err != nil {
				return fmt.Errorf("decrypt completed SSO handoff: %w", err)
			}
			token = t
			return nil
		}
		if hf.Channel != "" || hf.ConsumedAt != nil {
			return ErrHandoffInvalid
		}

		now := h.nowFunc()
		t, err := h.newToken(hf.UserID, hf.Email, now)
		if err != nil {
			return fmt.Errorf("issue SSO session: %w", err)
		}
		sealed, err := h.seal(t, aad)
		if err != nil {
			return fmt.Errorf("seal SSO session: %w", err)
		}
		hf.Channel = channel
		hf.TokenCiphertext = sealed
		hf.ConsumedAt = &now
		if replayExpiry := now.Add(handoffReplayTTL); replayExpiry.Before(hf.ExpiresAt) {
			hf.ExpiresAt = replayExpiry
		}
		token = t
		return nil
	})
	if errors.Is(err, ErrHandoffNotFound) {
		return "", ErrHandoffInvalid
	}
	if err != nil {
		return "", err
	}
	if token == "" {
		return "", ErrHandoffInvalid
	}
	return token, nil
}

func HashHandoffCode(code string) string {
	sum := sha256.Sum256([]byte(code))
	return hex.EncodeToString(sum[:])
}

func verifierMatchesChallenge(verifier, challenge string) bool {
	if verifier == "" || challenge == "" {
		return false
	}
	return hmac.Equal([]byte(PKCEChallengeS256(verifier)), []byte(challenge))
}

func (h *Handoffs) seal(token string, aad []byte) ([]byte, error) {
	aead, err := h.aead()
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	return aead.Seal(nonce, nonce, []byte(token), aad), nil
}

func (h *Handoffs) open(ciphertext, aad []byte) (string, error) {
	aead, err := h.aead()
	if err != nil {
		return "", err
	}
	if len(ciphertext) < aead.NonceSize() {
		return "", errors.New("session token ciphertext is truncated")
	}
	plain, err := aead.Open(nil, ciphertext[:aead.NonceSize()], ciphertext[aead.NonceSize():], aad)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

func (h *Handoffs) aead() (cipher.AEAD, error) {
	block, err := aes.NewCipher(h.sealKey[:])
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}
