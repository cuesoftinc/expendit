package cache

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestMemoryStoreSSOStartLimitsSourceAndGlobalCapacity(t *testing.T) {
	store := NewMemoryStore()
	now := time.Unix(1_700_000_000, 0)
	limits := SSOStartLimits{
		RateWindow:    time.Minute,
		StateTTL:      10 * time.Minute,
		SourceRate:    2,
		GlobalRate:    10,
		SourcePending: 3,
		GlobalPending: 3,
	}
	ctx := context.Background()

	for i := 0; i < 2; i++ {
		allowed, err := store.AllowSSOStart(ctx, "source-a", string(rune('a'+i)), now, limits)
		if err != nil || !allowed {
			t.Fatalf("request %d allowed = %v, error = %v", i+1, allowed, err)
		}
	}
	allowed, err := store.AllowSSOStart(ctx, "source-a", "source-rate-limit", now, limits)
	if err != nil || allowed {
		t.Fatalf("per-source rate limit allowed = %v, error = %v", allowed, err)
	}

	allowed, err = store.AllowSSOStart(ctx, "source-b", "global-third", now, limits)
	if err != nil || !allowed {
		t.Fatalf("third global reservation allowed = %v, error = %v", allowed, err)
	}
	allowed, err = store.AllowSSOStart(ctx, "source-c", "global-pending-limit", now, limits)
	if err != nil || allowed {
		t.Fatalf("global pending limit allowed = %v, error = %v", allowed, err)
	}

	if err := store.ReleaseSSOStart(ctx, "source-a", "a"); err != nil {
		t.Fatal(err)
	}
	allowed, err = store.AllowSSOStart(ctx, "source-c", "after-release", now, limits)
	if err != nil || !allowed {
		t.Fatalf("reservation after release allowed = %v, error = %v", allowed, err)
	}

	allowed, err = store.AllowSSOStart(ctx, "source-c", "after-expiry", now.Add(limits.StateTTL+time.Nanosecond), limits)
	if err != nil || !allowed {
		t.Fatalf("reservation after expiry allowed = %v, error = %v", allowed, err)
	}
}

// An unattributed source must spend the per-source cap, not skip it.
func TestUnattributedSourceSharesOneBucket(t *testing.T) {
	store := NewMemoryStore()
	limits := SSOStartLimits{
		RateWindow:    time.Minute,
		StateTTL:      10 * time.Minute,
		SourceRate:    1,
		GlobalRate:    3,
		SourcePending: 1,
		GlobalPending: 3,
	}
	now := time.Now()
	ctx := context.Background()

	allowed, err := store.AllowSSOStart(ctx, "", "first", now, limits)
	if err != nil || !allowed {
		t.Fatalf("first unattributed start = %v, %v", allowed, err)
	}
	allowed, err = store.AllowSSOStart(ctx, "", "limited", now, limits)
	if err != nil || allowed {
		t.Fatalf("unattributed start exceeded SourceRate: %v, %v", allowed, err)
	}
	allowed, err = store.AllowSSOStart(ctx, UnattributedSourceHash, "explicit", now, limits)
	if err != nil || allowed {
		t.Fatalf("explicit unattributed hash keyed a different bucket: %v, %v", allowed, err)
	}
	allowed, err = store.AllowSSOStart(ctx, "source-a", "honest", now, limits)
	if err != nil || !allowed {
		t.Fatalf("attributed caller starved by unattributed traffic: %v, %v", allowed, err)
	}
}

func TestReleaseReturnsUnattributedPendingCapacity(t *testing.T) {
	store := NewMemoryStore()
	limits := SSOStartLimits{
		RateWindow:    time.Minute,
		StateTTL:      10 * time.Minute,
		SourceRate:    10,
		GlobalRate:    10,
		SourcePending: 1,
		GlobalPending: 10,
	}
	now := time.Now()
	ctx := context.Background()

	if allowed, err := store.AllowSSOStart(ctx, "", "first", now, limits); err != nil || !allowed {
		t.Fatalf("first start = %v, %v", allowed, err)
	}
	if allowed, err := store.AllowSSOStart(ctx, "", "second", now, limits); err != nil || allowed {
		t.Fatalf("start exceeded SourcePending: %v, %v", allowed, err)
	}
	if err := store.ReleaseSSOStart(ctx, "", "first"); err != nil {
		t.Fatal(err)
	}
	if allowed, err := store.AllowSSOStart(ctx, "", "third", now, limits); err != nil || !allowed {
		t.Fatalf("pending capacity not returned by release: %v, %v", allowed, err)
	}
}

func TestInvalidLimitsAreRejected(t *testing.T) {
	_, err := NewMemoryStore().AllowSSOStart(context.Background(), "s", "r", time.Now(), SSOStartLimits{})
	if err == nil {
		t.Fatal("expected an error for zero limits")
	}
}

func TestTakeIsSingleUseAndExpires(t *testing.T) {
	store := NewMemoryStore()
	ctx := context.Background()
	type record struct{ A string }

	if err := store.Set(ctx, "k", record{A: "x"}, time.Minute); err != nil {
		t.Fatal(err)
	}
	var got record
	if err := store.Take(ctx, "k", &got); err != nil || got.A != "x" {
		t.Fatalf("first take = %+v, %v", got, err)
	}
	if err := store.Take(ctx, "k", &got); !errors.Is(err, ErrMiss) {
		t.Fatalf("second take error = %v, want ErrMiss", err)
	}

	if err := store.Set(ctx, "old", record{A: "y"}, time.Nanosecond); err != nil {
		t.Fatal(err)
	}
	time.Sleep(2 * time.Millisecond)
	if err := store.Take(ctx, "old", &got); !errors.Is(err, ErrMiss) {
		t.Fatalf("expired take error = %v, want ErrMiss", err)
	}
}

func TestSourceHash(t *testing.T) {
	if SourceHash("") != UnattributedSourceHash {
		t.Fatal("empty address must map to the unattributed bucket")
	}
	if SourceHash("203.0.113.9") == SourceHash("203.0.113.10") {
		t.Fatal("distinct addresses must hash apart")
	}
}

func TestSourceHashBucketsIPv6By64(t *testing.T) {
	if SourceHash("2001:db8:1:2::1") != SourceHash("2001:db8:1:2:ffff::9") {
		t.Fatal("same /64 split into two buckets")
	}
	if SourceHash("2001:db8:1:2::1") == SourceHash("2001:db8:1:3::1") {
		t.Fatal("different /64s share a bucket")
	}
}
