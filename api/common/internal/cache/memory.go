package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// sweepInterval bounds how often the whole map is walked for expired
// entries; day-to-day expiry happens per key on access.
const sweepInterval = time.Minute

// MemoryStore is the in-process Store, for one instance.
type MemoryStore struct {
	mu        sync.Mutex
	entries   map[string]memoryEntry
	limiter   memorySSOLimiter
	lastSweep time.Time
}

type memoryEntry struct {
	value     []byte
	expiresAt time.Time
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{entries: make(map[string]memoryEntry)}
}

func (m *MemoryStore) Set(_ context.Context, key string, v any, ttl time.Duration) error {
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("cache: marshal: %w", err)
	}
	entry := memoryEntry{value: b}
	now := time.Now()
	if ttl > 0 {
		entry.expiresAt = now.Add(ttl)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.maybeSweep(now)
	m.entries[key] = entry
	return nil
}

func (m *MemoryStore) Take(_ context.Context, key string, dst any) error {
	m.mu.Lock()
	now := time.Now()
	m.maybeSweep(now)
	entry, ok := m.entries[key]
	if ok {
		delete(m.entries, key)
	}
	m.mu.Unlock()

	if !ok || (!entry.expiresAt.IsZero() && now.After(entry.expiresAt)) {
		return ErrMiss
	}
	return json.Unmarshal(entry.value, dst)
}

// maybeSweep drops expired entries at most once per interval; callers hold mu.
func (m *MemoryStore) maybeSweep(now time.Time) {
	if now.Sub(m.lastSweep) < sweepInterval {
		return
	}
	m.lastSweep = now
	for k, e := range m.entries {
		if !e.expiresAt.IsZero() && now.After(e.expiresAt) {
			delete(m.entries, k)
		}
	}
}

func (m *MemoryStore) AllowSSOStart(ctx context.Context, sourceHash, reservationID string, now time.Time, limits SSOStartLimits) (bool, error) {
	if err := limits.validate(); err != nil {
		return false, err
	}
	if err := ctx.Err(); err != nil {
		return false, err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.limiter.allow(sourceBucket(sourceHash), reservationID, now, limits), nil
}

func (m *MemoryStore) ReleaseSSOStart(ctx context.Context, sourceHash, reservationID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.limiter.release(sourceBucket(sourceHash), reservationID)
	return nil
}

func (m *MemoryStore) Close() error { return nil }
