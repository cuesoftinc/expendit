package ticket

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestIssueMatchesTheDocumentedFormat(t *testing.T) {
	seed := make([]byte, ed25519.SeedSize)
	key := ed25519.NewKeyFromSeed(seed)
	s := NewSigner("2026-10", key, 5*time.Minute)
	now := time.Unix(1_791_367_200, 0)

	encoded, claims := s.Issue("3f6e2b1a-9c8d-4e7f-a6b5-c4d3e2f1a0b9", Target{Kind: "import_job", ID: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f"}, "pdf", 15<<20, now)

	parts := strings.Split(encoded, ".")
	if len(parts) != 3 || parts[0] != "v1" {
		t.Fatalf("want v1.<claims>.<signature>, got %q", encoded)
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !ed25519.Verify(key.Public().(ed25519.PublicKey), []byte(parts[0]+"."+parts[1]), sig) {
		t.Fatal("signature does not verify over v1.<claims>")
	}
	payload, _ := base64.RawURLEncoding.DecodeString(parts[1])
	var decoded Claims
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded != claims || decoded.EXP-decoded.IAT != 300 || decoded.KID != "2026-10" || decoded.MaxBytes != 15<<20 {
		t.Fatalf("claims round-trip: %+v", decoded)
	}
	if !strings.HasPrefix(s.PublicKey(), "2026-10:") {
		t.Fatalf("public key line: %s", s.PublicKey())
	}
}
