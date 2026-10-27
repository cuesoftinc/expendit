package config

import (
	"strings"
	"testing"
	"time"
)

func TestLoadReportsEveryMissingSetting(t *testing.T) {
	for _, k := range []string{"DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "JWT_SECRET", "SESSION_SECRET", "KAFKA_BROKERS", "STORAGE_BUCKET", "STORAGE_PREFIX", "UPLOAD_TICKET_PRIVATE_KEY", "STORAGE_DRIVER"} {
		t.Setenv(k, "")
	}
	_, err := Load()
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, k := range []string{"DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "JWT_SECRET", "SESSION_SECRET", "KAFKA_BROKERS", "STORAGE_BUCKET", "STORAGE_PREFIX", "UPLOAD_TICKET_PRIVATE_KEY"} {
		if !strings.Contains(err.Error(), k) {
			t.Errorf("error does not name %s: %v", k, err)
		}
	}
}

func TestLoadParsesTheTicketKey(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://x")
	t.Setenv("GOOGLE_CLIENT_ID", "id")
	t.Setenv("GOOGLE_CLIENT_SECRET", "secret")
	t.Setenv("JWT_SECRET", strings.Repeat("j", 32))
	t.Setenv("SESSION_SECRET", "session")
	t.Setenv("JWT_ACCESS_TTL", "")
	t.Setenv("JWT_EXPIRY_HOURS", "")
	t.Setenv("KAFKA_BROKERS", "a:9092, b:9092")
	t.Setenv("STORAGE_DRIVER", "s3")
	t.Setenv("STORAGE_ENDPOINT", "localhost:9000")
	t.Setenv("STORAGE_BUCKET", "b")
	t.Setenv("STORAGE_PREFIX", "expendit/local/")
	t.Setenv("UPLOAD_TICKET_PRIVATE_KEY", "k1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Ticket.KeyID != "k1" || len(cfg.Ticket.PrivateKey) != 64 {
		t.Fatalf("ticket key: %+v", cfg.Ticket.KeyID)
	}
	if len(cfg.Kafka.Brokers) != 2 || cfg.Storage.Prefix != "expendit/local" || cfg.UploadMaxBytes != 15<<20 {
		t.Fatalf("parsed: %+v %q", cfg.Kafka.Brokers, cfg.Storage.Prefix)
	}

	t.Setenv("UPLOAD_TICKET_PRIVATE_KEY", "k1:short")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "UPLOAD_TICKET_PRIVATE_KEY") {
		t.Fatalf("want a key error, got %v", err)
	}
}

func TestLoadReadsTheSessionSettings(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://x")
	t.Setenv("GOOGLE_CLIENT_ID", "id")
	t.Setenv("GOOGLE_CLIENT_SECRET", "secret")
	t.Setenv("JWT_SECRET", strings.Repeat("j", 32))
	t.Setenv("SESSION_SECRET", "session")
	t.Setenv("KAFKA_BROKERS", "a:9092")
	t.Setenv("STORAGE_DRIVER", "s3")
	t.Setenv("STORAGE_ENDPOINT", "localhost:9000")
	t.Setenv("STORAGE_BUCKET", "b")
	t.Setenv("STORAGE_PREFIX", "expendit/local")
	t.Setenv("UPLOAD_TICKET_PRIVATE_KEY", "k1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
	t.Setenv("JWT_ACCESS_TTL", "")
	t.Setenv("JWT_EXPIRY_HOURS", "")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Auth.JWTAccessTTL != 24*time.Hour || cfg.Auth.SessionCookieName != "expendit_session" || cfg.Auth.SecureCookies {
		t.Fatalf("defaults: %+v", cfg.Auth)
	}

	t.Setenv("JWT_EXPIRY_HOURS", "2")
	if cfg, _ = Load(); cfg.Auth.JWTAccessTTL != 2*time.Hour {
		t.Fatalf("hours fallback: %v", cfg.Auth.JWTAccessTTL)
	}
	t.Setenv("JWT_ACCESS_TTL", "30m")
	t.Setenv("GOOGLE_REDIRECT_URI", "https://app.example.com/api/v1/auth/sso/google/callback")
	if cfg, _ = Load(); cfg.Auth.JWTAccessTTL != 30*time.Minute || !cfg.Auth.SecureCookies {
		t.Fatalf("explicit ttl: %+v", cfg.Auth)
	}

	t.Setenv("JWT_ACCESS_TTL", "soon")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "JWT_ACCESS_TTL") {
		t.Fatalf("want a ttl error, got %v", err)
	}
	t.Setenv("JWT_ACCESS_TTL", "")
	t.Setenv("JWT_SECRET", "short")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "JWT_SECRET") {
		t.Fatalf("want a secret error, got %v", err)
	}
}
