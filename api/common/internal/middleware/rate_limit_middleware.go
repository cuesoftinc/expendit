package middleware

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// limiterBackend is the shared interface for in-memory and Redis backends.
type limiterBackend interface {
	allow(key string) bool
}

// --- In-memory backend ---

type memLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	limit    int
	window   time.Duration
}

func newMemLimiter(limit int, window time.Duration) *memLimiter {
	rl := &memLimiter{
		attempts: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	go rl.cleanup()
	return rl
}

func (rl *memLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-rl.window)
		for key, times := range rl.attempts {
			valid := times[:0]
			for _, t := range times {
				if t.After(cutoff) {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.attempts, key)
			} else {
				rl.attempts[key] = valid
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *memLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	times := rl.attempts[key]
	valid := times[:0]
	for _, t := range times {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	rl.attempts[key] = valid

	if len(valid) >= rl.limit {
		return false
	}

	rl.attempts[key] = append(rl.attempts[key], now)
	return true
}

// --- Redis backend ---

// Atomic sliding-window check-and-increment via Lua script.
var rateLimitScript = redis.NewScript(`
local key          = KEYS[1]
local now          = tonumber(ARGV[1])
local window_start = tonumber(ARGV[2])
local limit        = tonumber(ARGV[3])
local window_secs  = tonumber(ARGV[4])

redis.call('ZREMRANGEBYSCORE', key, '0', window_start)
local count = redis.call('ZCARD', key)

if count >= limit then
  return 0
end

redis.call('ZADD', key, now, now)
redis.call('EXPIRE', key, window_secs)
return 1
`)

type redisLimiter struct {
	client *redis.Client
	limit  int
	window time.Duration
	prefix string
}

func (rl *redisLimiter) allow(key string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	now := time.Now().UnixNano()
	windowStart := time.Now().Add(-rl.window).UnixNano()

	result, err := rateLimitScript.Run(ctx, rl.client,
		[]string{rl.prefix + ":" + key},
		strconv.FormatInt(now, 10),
		strconv.FormatInt(windowStart, 10),
		rl.limit,
		int(rl.window.Seconds()),
	).Int()

	if err != nil {
		// Redis unavailable — fail open so the app keeps working.
		log.Printf("rate limiter: redis error: %v", err)
		return true
	}

	return result == 1
}

// --- Factory ---

// newLimiter returns a Redis-backed limiter when REDIS_URL is set,
// otherwise falls back to the in-memory implementation.
func newLimiter(prefix string, limit int, window time.Duration) limiterBackend {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		return newMemLimiter(limit, window)
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("rate limiter: invalid REDIS_URL (%v), using in-memory fallback", err)
		return newMemLimiter(limit, window)
	}

	client := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("rate limiter: cannot reach Redis (%v), using in-memory fallback", err)
		return newMemLimiter(limit, window)
	}

	log.Printf("rate limiter: using Redis backend (%s)", redisURL)
	return &redisLimiter{client: client, limit: limit, window: window, prefix: prefix}
}

var (
	loginLimiter    = newLimiter("ratelimit:login", 5, 15*time.Minute)
	passwordLimiter = newLimiter("ratelimit:password", 3, 15*time.Minute)
)

// LoginRateLimit allows 5 login attempts per IP per 15 minutes.
func LoginRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !loginLimiter.allow(c.ClientIP()) {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many login attempts, please try again in 15 minutes"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// PasswordRateLimit allows 3 password reset attempts per IP per 15 minutes.
func PasswordRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !passwordLimiter.allow(c.ClientIP()) {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many password reset attempts, please try again in 15 minutes"})
			c.Abort()
			return
		}
		c.Next()
	}
}
