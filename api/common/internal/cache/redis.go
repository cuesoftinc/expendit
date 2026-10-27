package cache

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/cuesoftinc/expendit/api/common/internal/config"
)

// RedisStore is the Store shared by every instance.
type RedisStore struct {
	rdb    *redis.Client
	prefix string
}

func NewRedisStore(cfg config.Redis) *RedisStore {
	opts := &redis.Options{
		Addr:     cfg.Host + ":" + cfg.Port,
		Username: cfg.Username,
		Password: cfg.Password,
		DB:       cfg.DB,
	}
	if cfg.TLS {
		opts.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}
	return &RedisStore{rdb: redis.NewClient(opts), prefix: cfg.KeyPrefix}
}

// Open returns the Redis store when REDIS_HOST is set, else the in-process one.
func Open(cfg config.Redis) Store {
	if cfg.Host == "" {
		return NewMemoryStore()
	}
	return NewRedisStore(cfg)
}

func (c *RedisStore) key(k string) string {
	if c.prefix == "" {
		return k
	}
	return c.prefix + ":" + k
}

func (c *RedisStore) Close() error { return c.rdb.Close() }

func (c *RedisStore) Set(ctx context.Context, key string, v any, ttl time.Duration) error {
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("cache: marshal: %w", err)
	}
	return c.rdb.Set(ctx, c.key(key), b, ttl).Err()
}

func (c *RedisStore) Take(ctx context.Context, key string, dst any) error {
	b, err := c.rdb.GetDel(ctx, c.key(key)).Bytes()
	if errors.Is(err, redis.Nil) {
		return ErrMiss
	}
	if err != nil {
		return fmt.Errorf("cache: take %q: %w", key, err)
	}
	if err := json.Unmarshal(b, dst); err != nil {
		return fmt.Errorf("cache: unmarshal %q: %w", key, err)
	}
	return nil
}
