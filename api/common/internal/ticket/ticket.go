// Package ticket issues upload tickets (S-5; format in
// api/common/contract/upload-ticket.md). Only api/common holds the signing
// key; api/statements verifies with the public key.
package ticket

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Target struct {
	Kind string `json:"kind"`
	ID   string `json:"id"`
}

type Claims struct {
	KID      string `json:"kid"`
	JTI      string `json:"jti"`
	OrgID    string `json:"org_id"`
	Target   Target `json:"target"`
	FileType string `json:"file_type"`
	MaxBytes int64  `json:"max_bytes"`
	IAT      int64  `json:"iat"`
	EXP      int64  `json:"exp"`
}

type Signer struct {
	kid string
	key ed25519.PrivateKey
	ttl time.Duration
}

func NewSigner(kid string, key ed25519.PrivateKey, ttl time.Duration) *Signer {
	return &Signer{kid: kid, key: key, ttl: ttl}
}

// Issue returns the encoded ticket and its claims.
func (s *Signer) Issue(orgID string, target Target, fileType string, maxBytes int64, now time.Time) (string, Claims) {
	c := Claims{
		KID: s.kid, JTI: uuid.NewString(), OrgID: orgID, Target: target, FileType: fileType,
		MaxBytes: maxBytes, IAT: now.Unix(), EXP: now.Add(s.ttl).Unix(),
	}
	payload, _ := json.Marshal(c) // plain struct; cannot fail
	head := "v1." + base64.RawURLEncoding.EncodeToString(payload)
	return head + "." + base64.RawURLEncoding.EncodeToString(ed25519.Sign(s.key, []byte(head))), c
}

// PublicKey is the verifier's half, in UPLOAD_TICKET_PUBLIC_KEYS form.
func (s *Signer) PublicKey() string {
	return s.kid + ":" + base64.RawURLEncoding.EncodeToString(s.key.Public().(ed25519.PublicKey))
}
