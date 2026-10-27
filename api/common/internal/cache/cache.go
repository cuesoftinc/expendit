// Package cache holds the short-lived sign-in state: the pending Google
// login and the start limiter. Redis backs it when REDIS_HOST is set, else
// it lives in this process.
package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/netip"
	"time"
)

// ErrMiss is returned when a key is absent or expired.
var ErrMiss = errors.New("cache: miss")

// UnattributedSourceHash is the shared bucket for requests with no source.
const UnattributedSourceHash = "unattributed"

// Store keeps pending sign-ins and meters sign-in starts.
type Store interface {
	Set(ctx context.Context, key string, v any, ttl time.Duration) error
	// Take reads and removes a value, or returns ErrMiss.
	Take(ctx context.Context, key string, dst any) error
	// AllowSSOStart reserves rate and pending capacity for one start.
	AllowSSOStart(ctx context.Context, sourceHash, reservationID string, now time.Time, limits SSOStartLimits) (bool, error)
	// ReleaseSSOStart frees pending capacity without resetting the rate window.
	ReleaseSSOStart(ctx context.Context, sourceHash, reservationID string) error
	Close() error
}

// SSOStateKey is the key of a pending Google login.
func SSOStateKey(state string) string { return "auth:sso:state:" + state }

// SourceHash buckets a caller by a hash of its address.
func SourceHash(addr string) string {
	if addr == "" {
		return UnattributedSourceHash
	}
	sum := sha256.Sum256([]byte(sourceBucketKey(addr)))
	return hex.EncodeToString(sum[:8])
}

// sourceBucketKey keys an IPv6 source by its /64, the block one subscriber controls.
func sourceBucketKey(ip string) string {
	addr, err := netip.ParseAddr(ip)
	if err != nil || !addr.Is6() {
		return ip
	}
	prefix, err := addr.Unmap().WithZone("").Prefix(64)
	if err != nil {
		return ip
	}
	return prefix.String()
}

func sourceBucket(sourceHash string) string {
	if sourceHash == "" {
		return UnattributedSourceHash
	}
	return sourceHash
}
