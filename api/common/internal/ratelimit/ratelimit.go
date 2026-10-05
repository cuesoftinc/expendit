// Package ratelimit counts per-org usage in Redis (engineering.md §3).
// Losing Redis is survivable: limits fail open for the outage (§9.2), while
// idempotency and single-use tickets stay enforced in Postgres.
package ratelimit

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/cuesoftinc/expendit/api/common/internal/config"
)

type Limiter struct {
	client *redis.Client
}

// New returns nil when REDIS_HOST is unset (limits disabled).
func New(cfg config.Redis) *Limiter {
	if cfg.Host == "" {
		return nil
	}
	opts := &redis.Options{
		Addr:     cfg.Host + ":" + cfg.Port,
		Username: cfg.Username,
		Password: cfg.Password,
		DB:       cfg.DB,
	}
	if cfg.TLS {
		opts.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}
	return &Limiter{client: redis.NewClient(opts)}
}

func (l *Limiter) Close() error {
	if l == nil {
		return nil
	}
	return l.client.Close()
}

// Rule is one fixed window: at most Max units per Window.
type Rule struct {
	Name   string
	Max    int64
	Window time.Duration
}

// Take adds cost to every rule's window for key, unless that would exceed
// one of them. It returns the longest wait when refused.
func (l *Limiter) Take(ctx context.Context, key string, cost int64, rules ...Rule) (ok bool, retryAfter time.Duration) {
	if l == nil {
		return true, 0
	}
	now := time.Now()
	keys := make([]string, len(rules))
	for i, r := range rules {
		keys[i] = fmt.Sprintf("rl:%s:%s:%d", r.Name, key, now.Unix()/int64(r.Window.Seconds()))
	}
	// Check every window first, then add to all: one refusal costs nothing.
	values, err := l.client.MGet(ctx, keys...).Result()
	if err != nil {
		slog.Warn("rate limiter unavailable; failing open", "error", err)
		return true, 0
	}
	for i, r := range rules {
		var used int64
		if s, ok := values[i].(string); ok {
			fmt.Sscan(s, &used) //nolint:errcheck // a corrupt counter reads as 0
		}
		if used+cost > r.Max {
			wait := r.Window - time.Duration(now.Unix()%int64(r.Window.Seconds()))*time.Second
			return false, max(retryAfter, wait)
		}
	}
	pipe := l.client.TxPipeline()
	for i, r := range rules {
		pipe.IncrBy(ctx, keys[i], cost)
		pipe.Expire(ctx, keys[i], r.Window)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		slog.Warn("rate limiter unavailable; failing open", "error", err)
	}
	return true, 0
}

func (l *Limiter) Ping(ctx context.Context) error {
	if l == nil {
		return nil
	}
	return l.client.Ping(ctx).Err()
}
