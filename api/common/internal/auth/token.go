package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the session token payload; Subject is the user id.
type Claims struct {
	jwt.RegisteredClaims
	Email string `json:"email"`
}

// Tokens issues and parses session JWTs.
type Tokens struct {
	secret []byte
	ttl    time.Duration
}

func NewTokens(secret string, ttl time.Duration) *Tokens {
	return &Tokens{secret: []byte(secret), ttl: ttl}
}

func (t *Tokens) Issue(userID, email string, now time.Time) (string, error) {
	jti := make([]byte, 16)
	if _, err := rand.Read(jti); err != nil {
		return "", fmt.Errorf("auth: token id: %w", err)
	}
	c := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ID:        hex.EncodeToString(jti),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(t.ttl)),
		},
		Email: email,
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(t.secret)
}

func (t *Tokens) Parse(raw string) (*Claims, error) {
	var c Claims
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(30*time.Second),
	)
	_, err := parser.ParseWithClaims(raw, &c, func(*jwt.Token) (any, error) { return t.secret, nil })
	if errors.Is(err, jwt.ErrTokenExpired) {
		return nil, ErrExpired
	}
	if err != nil || c.Subject == "" {
		return nil, ErrInvalidToken
	}
	return &c, nil
}

// TTL is how long an issued token lives.
func (t *Tokens) TTL() time.Duration { return t.ttl }
