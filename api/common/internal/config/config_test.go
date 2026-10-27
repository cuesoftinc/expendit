package config

import (
	"strings"
	"testing"
)

func TestLoadReportsEveryMissingSetting(t *testing.T) {
	for _, k := range []string{"DATABASE_URL", "FIREBASE_PROJECT_ID", "KAFKA_BROKERS", "STORAGE_BUCKET", "STORAGE_PREFIX", "UPLOAD_TICKET_PRIVATE_KEY", "STORAGE_DRIVER"} {
		t.Setenv(k, "")
	}
	_, err := Load()
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, k := range []string{"DATABASE_URL", "FIREBASE_PROJECT_ID", "KAFKA_BROKERS", "STORAGE_BUCKET", "STORAGE_PREFIX", "UPLOAD_TICKET_PRIVATE_KEY"} {
		if !strings.Contains(err.Error(), k) {
			t.Errorf("error does not name %s: %v", k, err)
		}
	}
}

func TestLoadParsesTheTicketKey(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://x")
	t.Setenv("FIREBASE_PROJECT_ID", "p")
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
