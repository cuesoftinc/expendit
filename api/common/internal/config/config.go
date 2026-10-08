// Package config is the typed environment config (CueLABS standard: fail
// fast on missing settings). Names follow docs/system-design.md §10.3.
// Nothing else in the service reads the environment.
package config

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port        string
	CORSOrigins []string
	DatabaseURL string

	Kafka   Kafka
	Redis   Redis
	Storage Storage

	// Firebase ID tokens (X-1). With FIREBASE_AUTH_EMULATOR_HOST set, the
	// emulator's unsigned tokens are accepted instead (local only).
	FirebaseProjectID    string
	FirebaseEmulatorHost string

	Ticket Ticket

	// Limits enforced before a ticket exists (engineering.md §3).
	UploadsPerHour  int
	UploadsPerDay   int
	UploadBytesDay  int64
	UploadMaxBytes  int64
	ImportReapAfter time.Duration
}

type Kafka struct {
	Brokers  []string
	Username string
	Password string
	SSLCA    string
}

type Redis struct {
	Host     string
	Port     string
	Username string
	Password string
	TLS      bool
	DB       int
}

type Storage struct {
	Driver    string // gcs | s3
	Bucket    string
	Prefix    string // e.g. expendit/stg
	Endpoint  string
	AccessKey string
	SecretKey string
	UseSSL    bool
}

type Ticket struct {
	KeyID      string
	PrivateKey ed25519.PrivateKey
	TTL        time.Duration
}

// Load reads the environment; it returns every missing setting at once.
func Load() (*Config, error) {
	var missing []string
	need := func(name string) string {
		v := strings.TrimSpace(os.Getenv(name))
		if v == "" {
			missing = append(missing, name)
		}
		return v
	}

	cfg := &Config{
		Port:                 or(os.Getenv("PORT"), "8080"),
		CORSOrigins:          split(or(os.Getenv("CORS_ORIGINS"), "http://localhost:3000")),
		DatabaseURL:          need("DATABASE_URL"),
		FirebaseProjectID:    need("FIREBASE_PROJECT_ID"),
		FirebaseEmulatorHost: os.Getenv("FIREBASE_AUTH_EMULATOR_HOST"),
		Kafka: Kafka{
			Brokers:  split(need("KAFKA_BROKERS")),
			Username: os.Getenv("KAFKA_USERNAME"),
			Password: os.Getenv("KAFKA_PASSWORD"),
			SSLCA:    os.Getenv("KAFKA_SSL_CA"),
		},
		Redis: Redis{
			Host:     os.Getenv("REDIS_HOST"),
			Port:     or(os.Getenv("REDIS_PORT"), "6379"),
			Username: os.Getenv("REDIS_USERNAME"),
			Password: os.Getenv("REDIS_PASSWORD"),
			TLS:      os.Getenv("REDIS_TLS") == "true",
			DB:       atoi(os.Getenv("REDIS_DB"), 0),
		},
		Storage: Storage{
			Driver:    or(os.Getenv("STORAGE_DRIVER"), "gcs"),
			Bucket:    need("STORAGE_BUCKET"),
			Prefix:    strings.TrimRight(need("STORAGE_PREFIX"), "/"),
			Endpoint:  os.Getenv("STORAGE_ENDPOINT"),
			AccessKey: os.Getenv("STORAGE_ACCESS_KEY"),
			SecretKey: os.Getenv("STORAGE_SECRET_KEY"),
			UseSSL:    os.Getenv("STORAGE_USE_SSL") != "false",
		},
		UploadsPerHour:  atoi(os.Getenv("UPLOADS_PER_HOUR"), 10),
		UploadsPerDay:   atoi(os.Getenv("UPLOADS_PER_DAY"), 30),
		UploadBytesDay:  int64(atoi(os.Getenv("UPLOAD_BYTES_PER_DAY"), 200<<20)),
		UploadMaxBytes:  15 << 20, // S-6
		ImportReapAfter: 10 * time.Minute,
	}

	if cfg.Storage.Driver != "gcs" && cfg.Storage.Driver != "s3" {
		missing = append(missing, "STORAGE_DRIVER (gcs|s3)")
	}
	if cfg.Storage.Driver == "s3" && cfg.Storage.Endpoint == "" {
		missing = append(missing, "STORAGE_ENDPOINT")
	}

	ticket, err := parseTicketKey(need("UPLOAD_TICKET_PRIVATE_KEY"))
	if err != nil && !errors.Is(err, errEmpty) {
		missing = append(missing, "UPLOAD_TICKET_PRIVATE_KEY ("+err.Error()+")")
	}
	cfg.Ticket = ticket

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing or invalid configuration: %s", strings.Join(missing, ", "))
	}
	return cfg, nil
}

var errEmpty = errors.New("empty")

// parseTicketKey reads kid:<base64url 32-byte Ed25519 seed>.
func parseTicketKey(raw string) (Ticket, error) {
	if raw == "" {
		return Ticket{}, errEmpty
	}
	kid, encoded, ok := strings.Cut(raw, ":")
	seed, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(encoded, "="))
	if !ok || kid == "" || err != nil || len(seed) != ed25519.SeedSize {
		return Ticket{}, errors.New("want kid:<base64url 32-byte seed>")
	}
	return Ticket{KeyID: kid, PrivateKey: ed25519.NewKeyFromSeed(seed), TTL: 5 * time.Minute}, nil
}

func or(v, fallback string) string {
	if strings.TrimSpace(v) == "" {
		return fallback
	}
	return strings.TrimSpace(v)
}

func split(v string) []string {
	var out []string
	for _, s := range strings.Split(v, ",") {
		if s = strings.TrimSpace(s); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func atoi(v string, fallback int) int {
	if n, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
		return n
	}
	return fallback
}
