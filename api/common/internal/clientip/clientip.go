// Package clientip attributes a request to a client address that a caller
// cannot forge, for use as a rate-limit bucket key.
package clientip

import (
	"fmt"
	"net/http"
	"net/netip"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// Trusted-proxy attribution, ported from cueprise's requestSourceIP so the
// estate resolves client IPs the same way. Peer CIDRs are validated instead of
// counting hops: Cloud Run ingress is open, so the direct-to-origin chain is a
// hop shorter than the Cloudflare one and any fixed count reads a forged entry
// on one of the two paths.
//
//	TRUST_PROXY_HEADERS    trust forwarding headers at all (default false)
//	TRUSTED_PROXY_CIDRS    comma-separated CIDRs whose XFF entries we consume
//	TRUSTED_PROXY_HOPS     positional fallback; keep 0 unless the chain length
//	                       is enforced by infrastructure on every ingress path
//	CLOUDFLARE_PROXY_CIDRS CIDRs where CF-Connecting-IP is authoritative
type resolver struct {
	trustHeaders    bool
	trustedCIDRs    []netip.Prefix
	cloudflareCIDRs []netip.Prefix
	hops            int
}

// Zero value trusts nothing, so an unconfigured process still buckets on the
// network peer rather than on a caller-supplied header.
var configured resolver

// Configure loads the proxy contract and stops gin from doing its own header
// parsing. gin.New() trusts 0.0.0.0/0 with ForwardedByClientIP, so an
// unconfigured c.ClientIP() returns the caller's leftmost X-Forwarded-For.
func Configure(engine *gin.Engine) error {
	r, err := newResolver()
	if err != nil {
		return err
	}
	configured = r
	return engine.SetTrustedProxies(nil)
}

// Resolve returns the rate-limit bucket key for a request: the attributed
// client address, or the network peer when the chain cannot be trusted.
func Resolve(c *gin.Context) string {
	return configured.bucketKey(c.Request)
}

func newResolver() (resolver, error) {
	trustedCIDRs, err := parseCIDRs(os.Getenv("TRUSTED_PROXY_CIDRS"))
	if err != nil {
		return resolver{}, fmt.Errorf("TRUSTED_PROXY_CIDRS: %w", err)
	}
	cloudflareCIDRs, err := parseCIDRs(os.Getenv("CLOUDFLARE_PROXY_CIDRS"))
	if err != nil {
		return resolver{}, fmt.Errorf("CLOUDFLARE_PROXY_CIDRS: %w", err)
	}
	hops, err := parseHops(os.Getenv("TRUSTED_PROXY_HOPS"))
	if err != nil {
		return resolver{}, fmt.Errorf("TRUSTED_PROXY_HOPS: %w", err)
	}

	r := resolver{
		trustHeaders:    parseBool(os.Getenv("TRUST_PROXY_HEADERS"), false),
		trustedCIDRs:    trustedCIDRs,
		cloudflareCIDRs: cloudflareCIDRs,
		hops:            hops,
	}
	if err := r.validate(); err != nil {
		return resolver{}, err
	}
	return r, nil
}

// validate rejects the misconfigurations that would silently make attribution
// forgeable or dead.
func (r resolver) validate() error {
	if r.trustHeaders && len(r.trustedCIDRs) == 0 && len(r.cloudflareCIDRs) == 0 && r.hops == 0 {
		return fmt.Errorf("TRUST_PROXY_HEADERS requires TRUSTED_PROXY_CIDRS, CLOUDFLARE_PROXY_CIDRS or TRUSTED_PROXY_HOPS")
	}
	if !r.trustHeaders && (len(r.trustedCIDRs) > 0 || len(r.cloudflareCIDRs) > 0 || r.hops > 0) {
		return fmt.Errorf("TRUSTED_PROXY_CIDRS, CLOUDFLARE_PROXY_CIDRS and TRUSTED_PROXY_HOPS require TRUST_PROXY_HEADERS=true")
	}
	return nil
}

// bucketKey never returns a caller-controlled value: an unattributable request
// falls back to the network peer, which over-groups but cannot be varied.
func (r resolver) bucketKey(req *http.Request) string {
	if ip, ok := r.resolve(req); ok {
		return ip
	}
	if peer, ok := parseRequestIP(req.RemoteAddr); ok {
		return peer.String()
	}
	return "unattributed"
}

func (r resolver) resolve(req *http.Request) (string, bool) {
	peer, ok := parseRequestIP(req.RemoteAddr)
	if !ok {
		return "", false
	}
	if !r.trustHeaders {
		return peer.String(), true
	}

	if prefixContains(r.cloudflareCIDRs, peer) {
		if connectingIP, valid := parseRequestIP(strings.TrimSpace(req.Header.Get("CF-Connecting-IP"))); valid {
			return connectingIP.String(), true
		}
		return "", false
	}

	// Repeated field lines are one comma-joined value in receipt order
	// (RFC 9110 5.3); reading only the first leaves a caller-written entry at
	// the trusted right-hand end of the chain.
	rawXFF := strings.TrimSpace(strings.Join(req.Header.Values("X-Forwarded-For"), ","))
	if rawXFF == "" {
		if prefixContains(r.trustedCIDRs, peer) || r.hops > 0 {
			return "", false
		}
		return peer.String(), true
	}
	parts := strings.Split(rawXFF, ",")

	current := peer
	trustedHops := 0
	// Parse only the hops we are authorized to consume: a malformed element
	// further left is caller-supplied padding and must not shift attribution,
	// while a malformed element inside the window has no honest reading.
	for i := len(parts) - 1; i >= 0; i-- {
		if !prefixContains(r.trustedCIDRs, current) && trustedHops >= r.hops {
			break
		}
		hop, valid := parseRequestIP(strings.TrimSpace(parts[i]))
		if !valid {
			return "", false
		}
		current = hop
		trustedHops++
	}
	if trustedHops == 0 {
		return peer.String(), true
	}
	if trustedHops < r.hops || prefixContains(r.trustedCIDRs, current) {
		return "", false
	}
	return current.String(), true
}

func parseRequestIP(raw string) (netip.Addr, bool) {
	if addrPort, err := netip.ParseAddrPort(raw); err == nil {
		return addrPort.Addr().Unmap(), true
	}
	addr, err := netip.ParseAddr(raw)
	if err != nil {
		return netip.Addr{}, false
	}
	return addr.Unmap(), true
}

func prefixContains(prefixes []netip.Prefix, addr netip.Addr) bool {
	for _, prefix := range prefixes {
		if prefix.Contains(addr) {
			return true
		}
	}
	return false
}

func parseCIDRs(raw string) ([]netip.Prefix, error) {
	values := splitCSV(raw)
	prefixes := make([]netip.Prefix, 0, len(values))
	for _, value := range values {
		prefix, err := netip.ParsePrefix(value)
		if err != nil {
			return nil, fmt.Errorf("invalid CIDR %q", value)
		}
		prefixes = append(prefixes, prefix.Masked())
	}
	return prefixes, nil
}

func parseHops(raw string) (int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, nil
	}
	hops, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("invalid integer %q", raw)
	}
	if hops < 0 {
		return 0, fmt.Errorf("must not be negative")
	}
	return hops, nil
}

func parseBool(raw string, fallback bool) bool {
	if v, err := strconv.ParseBool(strings.TrimSpace(raw)); err == nil {
		return v
	}
	return fallback
}

func splitCSV(s string) []string {
	out := make([]string, 0)
	for _, part := range strings.Split(s, ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
