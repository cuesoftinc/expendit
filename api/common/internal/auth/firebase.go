// Package auth verifies Firebase ID tokens (X-1: Firebase, Google provider
// only). Tokens are RS256 JWTs signed by Google's securetoken keys; the
// emulator's unsigned tokens are accepted only when FIREBASE_AUTH_EMULATOR_HOST
// is set (local development).
package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const jwksURL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpired      = errors.New("token expired")
	ErrProvider     = errors.New("only Google sign-in is supported")
)

// Identity is what the rest of the service learns from a token.
type Identity struct {
	UID   string
	Email string
	Name  string
}

type claims struct {
	jwt.RegisteredClaims
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Firebase      struct {
		SignInProvider string `json:"sign_in_provider"`
	} `json:"firebase"`
}

type Verifier struct {
	projectID string
	emulator  bool
	client    *http.Client

	mu      sync.Mutex
	keys    map[string]*rsa.PublicKey
	expires time.Time
}

func NewVerifier(projectID string, emulator bool) *Verifier {
	return &Verifier{projectID: projectID, emulator: emulator, client: &http.Client{Timeout: 10 * time.Second}}
}

func (v *Verifier) Verify(ctx context.Context, raw string) (*Identity, error) {
	var c claims
	if v.emulator {
		if err := decodeUnsigned(raw, &c); err != nil {
			return nil, ErrInvalidToken
		}
	} else {
		parser := jwt.NewParser(
			jwt.WithValidMethods([]string{"RS256"}),
			jwt.WithAudience(v.projectID),
			jwt.WithIssuer("https://securetoken.google.com/"+v.projectID),
			jwt.WithIssuedAt(),
			jwt.WithLeeway(30*time.Second),
		)
		_, err := parser.ParseWithClaims(raw, &c, func(t *jwt.Token) (any, error) {
			kid, _ := t.Header["kid"].(string)
			return v.key(ctx, kid)
		})
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpired
		}
		if err != nil {
			return nil, ErrInvalidToken
		}
	}
	if c.Subject == "" || c.Email == "" || !c.EmailVerified {
		return nil, ErrInvalidToken
	}
	if c.Firebase.SignInProvider != "google.com" {
		return nil, ErrProvider
	}
	return &Identity{UID: c.Subject, Email: strings.ToLower(c.Email), Name: c.Name}, nil
}

func (v *Verifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if key, ok := v.keys[kid]; ok && time.Now().Before(v.expires) {
		return key, nil
	}
	if err := v.refresh(ctx); err != nil {
		return nil, err
	}
	if key, ok := v.keys[kid]; ok {
		return key, nil
	}
	return nil, fmt.Errorf("unknown key id %q", kid)
}

func (v *Verifier) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, jwksURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks: %s", resp.Status)
	}
	var set struct {
		Keys []struct {
			Kid string `json:"kid"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return err
	}
	keys := map[string]*rsa.PublicKey{}
	for _, k := range set.Keys {
		n, errN := base64.RawURLEncoding.DecodeString(k.N)
		e, errE := base64.RawURLEncoding.DecodeString(k.E)
		if errN != nil || errE != nil {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
	}
	v.keys, v.expires = keys, time.Now().Add(maxAge(resp.Header.Get("Cache-Control")))
	return nil
}

func maxAge(cacheControl string) time.Duration {
	for _, part := range strings.Split(cacheControl, ",") {
		if age, ok := strings.CutPrefix(strings.TrimSpace(part), "max-age="); ok {
			if d, err := time.ParseDuration(age + "s"); err == nil {
				return d
			}
		}
	}
	return time.Hour
}

// decodeUnsigned reads an emulator token's payload without a signature.
func decodeUnsigned(raw string, out *claims) error {
	parts := strings.Split(raw, ".")
	if len(parts) < 2 {
		return ErrInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return err
	}
	if err := json.Unmarshal(payload, out); err != nil {
		return err
	}
	if out.ExpiresAt != nil && out.ExpiresAt.Before(time.Now()) {
		return ErrExpired
	}
	return nil
}
