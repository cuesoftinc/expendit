package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// SSOStartLimits bounds sign-in starts: a rate per window and the number of
// logins awaiting their Google callback, per source and overall.
type SSOStartLimits struct {
	RateWindow    time.Duration
	StateTTL      time.Duration
	SourceRate    int
	GlobalRate    int
	SourcePending int
	GlobalPending int
}

func (l SSOStartLimits) validate() error {
	if l.RateWindow <= 0 || l.StateTTL <= 0 || l.SourceRate <= 0 ||
		l.GlobalRate <= 0 || l.SourcePending <= 0 || l.GlobalPending <= 0 {
		return fmt.Errorf("cache: invalid SSO start limits")
	}
	return nil
}

var allowSSOStartScript = redis.NewScript(`
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", ARGV[1])
redis.call("ZREMRANGEBYSCORE", KEYS[2], "-inf", ARGV[1])
redis.call("ZREMRANGEBYSCORE", KEYS[3], "-inf", ARGV[2])
redis.call("ZREMRANGEBYSCORE", KEYS[4], "-inf", ARGV[2])

if redis.call("ZCARD", KEYS[1]) >= tonumber(ARGV[4])
	or redis.call("ZCARD", KEYS[2]) >= tonumber(ARGV[5])
	or redis.call("ZCARD", KEYS[3]) >= tonumber(ARGV[6])
	or redis.call("ZCARD", KEYS[4]) >= tonumber(ARGV[7]) then
	return 0
end

redis.call("ZADD", KEYS[1], ARGV[2], ARGV[10])
redis.call("ZADD", KEYS[2], ARGV[2], ARGV[10])
redis.call("ZADD", KEYS[3], ARGV[3], ARGV[10])
redis.call("ZADD", KEYS[4], ARGV[3], ARGV[10])
redis.call("PEXPIRE", KEYS[1], ARGV[8])
redis.call("PEXPIRE", KEYS[2], ARGV[8])
redis.call("PEXPIRE", KEYS[3], ARGV[9])
redis.call("PEXPIRE", KEYS[4], ARGV[9])
return 1
`)

var releaseSSOStartScript = redis.NewScript(`
for i = 1, #KEYS do
	redis.call("ZREM", KEYS[i], ARGV[1])
end
return 1
`)

// AllowSSOStart atomically reserves rate and pending-state capacity. An
// unattributed source shares one constant bucket rather than bypassing the
// per-source caps.
func (c *RedisStore) AllowSSOStart(ctx context.Context, sourceHash, reservationID string, now time.Time, limits SSOStartLimits) (bool, error) {
	if err := limits.validate(); err != nil {
		return false, err
	}
	source := sourceBucket(sourceHash)
	keys := []string{
		c.key("auth:sso:start:rate:source:" + source),
		c.key("auth:sso:start:rate:global"),
		c.key("auth:sso:start:pending:source:" + source),
		c.key("auth:sso:start:pending:global"),
	}
	result, err := allowSSOStartScript.Run(ctx, c.rdb, keys,
		now.Add(-limits.RateWindow).UnixMilli(),
		now.UnixMilli(),
		now.Add(limits.StateTTL).UnixMilli(),
		limits.SourceRate,
		limits.GlobalRate,
		limits.SourcePending,
		limits.GlobalPending,
		limits.RateWindow.Milliseconds(),
		limits.StateTTL.Milliseconds(),
		reservationID,
	).Int()
	if err != nil {
		return false, fmt.Errorf("cache: reserve SSO start: %w", err)
	}
	return result == 1, nil
}

func (c *RedisStore) ReleaseSSOStart(ctx context.Context, sourceHash, reservationID string) error {
	if reservationID == "" {
		return nil
	}
	keys := []string{
		c.key("auth:sso:start:pending:source:" + sourceBucket(sourceHash)),
		c.key("auth:sso:start:pending:global"),
	}
	if err := releaseSSOStartScript.Run(ctx, c.rdb, keys, reservationID).Err(); err != nil {
		return fmt.Errorf("cache: release SSO start: %w", err)
	}
	return nil
}

type reservation struct {
	id        string
	expiresAt time.Time
}

type sourceReservations struct {
	rateExpires []time.Time
	pending     []reservation
}

type memorySSOLimiter struct {
	sources       map[string]*sourceReservations
	globalRate    []reservation
	globalPending []reservation
}

func (l *memorySSOLimiter) allow(source, reservationID string, now time.Time, limits SSOStartLimits) bool {
	l.prune(now)
	src := l.sources[source]
	if src == nil {
		src = &sourceReservations{}
		l.sources[source] = src
	}

	limited := len(src.rateExpires) >= limits.SourceRate ||
		len(src.pending) >= limits.SourcePending ||
		len(l.globalRate) >= limits.GlobalRate ||
		len(l.globalPending) >= limits.GlobalPending
	if limited {
		if len(src.rateExpires) == 0 && len(src.pending) == 0 {
			delete(l.sources, source)
		}
		return false
	}

	rateExpiry := now.Add(limits.RateWindow)
	pendingExpiry := now.Add(limits.StateTTL)
	src.rateExpires = append(src.rateExpires, rateExpiry)
	src.pending = append(src.pending, reservation{id: reservationID, expiresAt: pendingExpiry})
	l.globalRate = append(l.globalRate, reservation{expiresAt: rateExpiry})
	l.globalPending = append(l.globalPending, reservation{id: reservationID, expiresAt: pendingExpiry})
	return true
}

func (l *memorySSOLimiter) release(source, reservationID string) {
	if src := l.sources[source]; src != nil {
		src.pending = removeReservation(src.pending, reservationID)
		if len(src.rateExpires) == 0 && len(src.pending) == 0 {
			delete(l.sources, source)
		}
	}
	l.globalPending = removeReservation(l.globalPending, reservationID)
}

func (l *memorySSOLimiter) prune(now time.Time) {
	if l.sources == nil {
		l.sources = make(map[string]*sourceReservations)
	}
	l.globalRate = pruneReservations(l.globalRate, now)
	l.globalPending = pruneReservations(l.globalPending, now)
	for source, src := range l.sources {
		src.rateExpires = pruneTimes(src.rateExpires, now)
		src.pending = pruneReservations(src.pending, now)
		if len(src.rateExpires) == 0 && len(src.pending) == 0 {
			delete(l.sources, source)
		}
	}
}

func pruneReservations(rs []reservation, now time.Time) []reservation {
	first := 0
	for first < len(rs) && !rs[first].expiresAt.After(now) {
		first++
	}
	return rs[first:]
}

func removeReservation(rs []reservation, id string) []reservation {
	for i := range rs {
		if rs[i].id == id {
			return append(rs[:i], rs[i+1:]...)
		}
	}
	return rs
}

func pruneTimes(times []time.Time, now time.Time) []time.Time {
	first := 0
	for first < len(times) && !times[first].After(now) {
		first++
	}
	return times[first:]
}
