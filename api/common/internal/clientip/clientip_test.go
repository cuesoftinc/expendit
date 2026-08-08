package clientip

import (
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

// Topology under test. 169.254.1.1 stands in for the Cloud Run front end that
// terminates every request; 172.71.10.5 for a Cloudflare egress address.
const (
	frontEndPeer   = "169.254.1.1"
	cloudflarePeer = "172.71.10.5"
	realClient     = "203.0.113.7"
	attacker       = "198.51.100.66"
	forged         = "198.51.100.9"

	frontEndCIDR   = "169.254.0.0/16"
	cloudflareCIDR = "172.71.0.0/16"
)

// One IPv6 end site and its bucket. A single host holding this /64 can source
// every ipv6Client* address below at will, so they must all share a bucket.
const (
	ipv6Client     = "2001:db8:abcd:1234::1"
	ipv6ClientLow  = "2001:db8:abcd:1234::2"
	ipv6ClientMid  = "2001:db8:abcd:1234:dead:beef:0:9"
	ipv6ClientHigh = "2001:db8:abcd:1234:ffff:ffff:ffff:ffff"
	ipv6Bucket     = "2001:db8:abcd:1234::/64"

	// Adjacent /64 out of the same /48 — a different bucket, and the reason
	// masking stops at /64 rather than /56 or /48.
	ipv6Neighbour       = "2001:db8:abcd:1235::1"
	ipv6NeighbourBucket = "2001:db8:abcd:1235::/64"
)

// forgeries are the header shapes a caller can put in front of an honest chain.
var forgeries = []struct {
	name   string
	prefix string
}{
	{"single entry", forged},
	{"multiple entries", forged + ", 198.51.100.10"},
	{"impersonating the edge", "172.71.9.9"},
	{"impersonating the peer", frontEndPeer},
	{"impersonating the real client", realClient},
	{"unparseable padding", "not-an-ip"},
	{"empty padding", "unknown, ,"},
	{"loopback", "127.0.0.1"},
	{"impersonating an ipv6 end site", ipv6Neighbour},
}

type deployment struct {
	name    string
	env     map[string]string
	peer    string
	headers http.Header
	want    string
}

func deployments() []deployment {
	return []deployment{
		{
			// Nothing configured: the header contract is unknown, so only the
			// network peer may be believed.
			name: "unconfigured, direct caller",
			env:  nil,
			peer: realClient,
			want: realClient,
		},
		{
			// Cloud Run behind Cloudflare: peer is the front end, which
			// appended the Cloudflare egress address to Cloudflare's chain.
			name: "cloudflare via cloud run front end",
			env: map[string]string{
				"TRUST_PROXY_HEADERS": "true",
				"TRUSTED_PROXY_CIDRS": frontEndCIDR + "," + cloudflareCIDR,
			},
			peer:    frontEndPeer,
			headers: http.Header{"X-Forwarded-For": []string{realClient + ", " + cloudflarePeer}},
			want:    realClient,
		},
		{
			// Same origin reached directly (Cloud Run ingress is open), so the
			// chain is one hop shorter. CIDR validation still lands on the
			// caller's own address; a hop count tuned for the line above would
			// consume one entry too many.
			name: "cloudflare bypassed, direct to origin",
			env: map[string]string{
				"TRUST_PROXY_HEADERS": "true",
				"TRUSTED_PROXY_CIDRS": frontEndCIDR + "," + cloudflareCIDR,
			},
			peer:    frontEndPeer,
			headers: http.Header{"X-Forwarded-For": []string{attacker}},
			want:    attacker,
		},
		{
			// Same topology with an IPv6 client, so the whole forgery matrix
			// runs against an attributed address that gets masked to its /64.
			name: "ipv6 client via cloud run front end",
			env: map[string]string{
				"TRUST_PROXY_HEADERS": "true",
				"TRUSTED_PROXY_CIDRS": frontEndCIDR + "," + cloudflareCIDR,
			},
			peer:    frontEndPeer,
			headers: http.Header{"X-Forwarded-For": []string{ipv6Client + ", " + cloudflarePeer}},
			want:    ipv6Bucket,
		},
		{
			// Cloudflare is the immediate peer (the helm/k8s path), so
			// CF-Connecting-IP is authoritative and the chain is not walked.
			name: "cloudflare as immediate peer",
			env: map[string]string{
				"TRUST_PROXY_HEADERS":    "true",
				"CLOUDFLARE_PROXY_CIDRS": cloudflareCIDR,
			},
			peer: cloudflarePeer,
			headers: http.Header{
				"Cf-Connecting-Ip": []string{realClient},
				"X-Forwarded-For":  []string{realClient},
			},
			want: realClient,
		},
	}
}

// TestForgedForwardedPrefixCannotChangeClientIP is the regression this package
// exists for: across every supported topology, prepending caller-written
// entries to the forwarding chain must not move the resolved address.
func TestForgedForwardedPrefixCannotChangeClientIP(t *testing.T) {
	for _, dep := range deployments() {
		t.Run(dep.name, func(t *testing.T) {
			engine := configuredEngine(t, dep.env)

			honest := resolveVia(t, engine, dep.peer, dep.headers)
			if honest != dep.want {
				t.Fatalf("honest chain resolved to %q, want %q", honest, dep.want)
			}

			for _, forgery := range forgeries {
				t.Run(forgery.name, func(t *testing.T) {
					got := resolveVia(t, engine, dep.peer, withForgedPrefix(dep.headers, forgery.prefix))
					if got != honest {
						t.Fatalf("forged %q moved the client IP to %q, want %q", forgery.prefix, got, honest)
					}
				})
			}

			t.Run("split across repeated header lines", func(t *testing.T) {
				headers := cloneHeader(dep.headers)
				headers["X-Forwarded-For"] = append([]string{forged}, headers.Values("X-Forwarded-For")...)
				if got := resolveVia(t, engine, dep.peer, headers); got != honest {
					t.Fatalf("repeated header lines moved the client IP to %q, want %q", got, honest)
				}
			})

			for _, header := range []string{"X-Real-IP", "True-Client-IP", "Cf-Connecting-Ip", "X-Client-IP", "Forwarded"} {
				if len(dep.headers.Values(header)) > 0 {
					continue // set by the edge in this topology, not by the caller
				}
				t.Run("forged "+header, func(t *testing.T) {
					headers := cloneHeader(dep.headers)
					headers.Set(header, forged)
					if got := resolveVia(t, engine, dep.peer, headers); got != honest {
						t.Fatalf("forged %s moved the client IP to %q, want %q", header, got, honest)
					}
				})
			}
		})
	}
}

// TestIPv6BucketsCollapseToTheEndSite is the regression for the /128 key: on
// the shipped default configuration, every address a /64 holder can source has
// to land in one bucket, and a neighbouring /64 has to land in another.
func TestIPv6BucketsCollapseToTheEndSite(t *testing.T) {
	engine := configuredEngine(t, nil) // TRUST_PROXY_HEADERS unset, as shipped

	sameEndSite := []string{ipv6Client, ipv6ClientLow, ipv6ClientMid, ipv6ClientHigh}
	for _, peer := range sameEndSite {
		// The bracketed host:port form is what net/http actually sets.
		remoteAddr := "[" + peer + "]:54321"
		if got := resolveViaRemoteAddr(t, engine, remoteAddr, nil); got != ipv6Bucket {
			t.Errorf("peer %s bucketed as %q, want the end site %q", remoteAddr, got, ipv6Bucket)
		}
	}

	if got := resolveViaRemoteAddr(t, engine, "["+ipv6Neighbour+"]:54321", nil); got != ipv6NeighbourBucket {
		t.Errorf("neighbouring /64 bucketed as %q, want %q", got, ipv6NeighbourBucket)
	}

	// Restate it as the attack: N addresses from one /64 must buy 1 bucket.
	buckets := map[string]bool{}
	for _, peer := range sameEndSite {
		buckets[resolveViaRemoteAddr(t, engine, "["+peer+"]:54321", nil)] = true
	}
	if len(buckets) != 1 {
		t.Errorf("%d addresses from one /64 minted %d buckets, want 1", len(sameEndSite), len(buckets))
	}
}

// TestIPv6MaskingAppliesToAttributedAddresses covers the other derivation path:
// an address read out of a trusted forwarding chain is masked too, not just a
// direct peer.
func TestIPv6MaskingAppliesToAttributedAddresses(t *testing.T) {
	for _, tc := range []struct {
		name    string
		env     map[string]string
		peer    string
		headers http.Header
	}{
		{
			name: "x-forwarded-for via the front end",
			env: map[string]string{
				"TRUST_PROXY_HEADERS": "true",
				"TRUSTED_PROXY_CIDRS": frontEndCIDR + "," + cloudflareCIDR,
			},
			peer:    frontEndPeer,
			headers: http.Header{"X-Forwarded-For": []string{"%s, " + cloudflarePeer}},
		},
		{
			name: "cf-connecting-ip from a cloudflare peer",
			env: map[string]string{
				"TRUST_PROXY_HEADERS":    "true",
				"CLOUDFLARE_PROXY_CIDRS": cloudflareCIDR,
			},
			peer:    cloudflarePeer,
			headers: http.Header{"Cf-Connecting-Ip": []string{"%s"}},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			engine := configuredEngine(t, tc.env)

			for _, client := range []string{ipv6Client, ipv6ClientMid, ipv6ClientHigh} {
				headers := http.Header{}
				for key, values := range tc.headers {
					headers.Set(key, strings.ReplaceAll(values[0], "%s", client))
				}
				if got := resolveVia(t, engine, tc.peer, headers); got != ipv6Bucket {
					t.Errorf("attributed client %s bucketed as %q, want %q", client, got, ipv6Bucket)
				}
			}
		})
	}
}

// TestIPv4BucketKeysAreNotMasked pins the other half of the contract: a /32 is
// already one host, so coarsening it would only over-group real callers.
func TestIPv4BucketKeysAreNotMasked(t *testing.T) {
	engine := configuredEngine(t, nil)

	for _, peer := range []string{realClient, attacker, "203.0.113.8", "127.0.0.1"} {
		got := resolveVia(t, engine, peer, nil)
		if got != peer {
			t.Errorf("IPv4 peer %s bucketed as %q, want the whole address", peer, got)
		}
		if strings.Contains(got, "/") {
			t.Errorf("IPv4 peer %s bucketed as a network %q", peer, got)
		}
	}

	// Neighbours in one /24 stay in separate buckets.
	if resolveVia(t, engine, "203.0.113.7", nil) == resolveVia(t, engine, "203.0.113.8", nil) {
		t.Error("two IPv4 addresses in one /24 shared a bucket")
	}
}

// Dual-stack servers write IPv4-mapped IPv6 (::ffff:a.b.c.d) into X-Forwarded-For
// — Node, Tomcat/Jetty and some Envoy/HAProxy configs all do. Masking made
// unmapping security-critical: without it every mapped client collapses to
// ::/64, i.e. one bucket for the whole IPv4 population, which is a global
// lockout at 5 attempts/15min rather than a bypass.
func TestIPv4MappedAddressesAreNotCollapsedIntoOneBucket(t *testing.T) {
	engine := configuredEngine(t, nil)

	mapped := []string{"::ffff:1.2.3.4", "::ffff:5.6.7.8", "::ffff:203.0.113.7"}
	seen := map[string]string{}
	for _, peer := range mapped {
		got := resolveVia(t, engine, peer, nil)
		if strings.Contains(got, "/") {
			t.Errorf("IPv4-mapped peer %s bucketed as a network %q — every mapped client shares it", peer, got)
		}
		if prev, dup := seen[got]; dup {
			t.Errorf("IPv4-mapped peers %s and %s shared bucket %q", prev, peer, got)
		}
		seen[got] = peer
	}

	// A mapped address must key identically to its plain IPv4 form.
	if got, want := resolveVia(t, engine, "::ffff:203.0.113.7", nil), resolveVia(t, engine, "203.0.113.7", nil); got != want {
		t.Errorf("::ffff:203.0.113.7 bucketed as %q but 203.0.113.7 as %q — same client, two buckets", got, want)
	}
}

// TestBucketKeyDoesNotCoarsenWhatGetsLogged keeps the split honest: the bucket
// key is masked, but c.ClientIP() — what handlers log and audit — is not.
func TestBucketKeyDoesNotCoarsenWhatGetsLogged(t *testing.T) {
	engine := configuredEngine(t, nil)

	if got := ginClientIPVia(t, engine, ipv6ClientMid, nil); got != ipv6ClientMid {
		t.Errorf("c.ClientIP() = %q, want the full address %q", got, ipv6ClientMid)
	}
	if got := resolveVia(t, engine, ipv6ClientMid, nil); got != ipv6Bucket {
		t.Errorf("BucketKey() = %q, want the masked %q", got, ipv6Bucket)
	}
}

// TestConfigureNeutersGinClientIP pins why Configure has to run: gin.New()
// trusts 0.0.0.0/0, so until it does, c.ClientIP() is the caller's own header.
func TestConfigureNeutersGinClientIP(t *testing.T) {
	headers := http.Header{"X-Forwarded-For": []string{forged + ", " + realClient}}

	unconfigured := gin.New()
	if got := ginClientIPVia(t, unconfigured, realClient, headers); got != forged {
		t.Fatalf("gin.New() c.ClientIP() = %q, want the forged leftmost entry %q "+
			"(if gin changed its default, revisit this package)", got, forged)
	}

	hardened := configuredEngine(t, nil)
	if got := ginClientIPVia(t, hardened, realClient, headers); got != realClient {
		t.Fatalf("after Configure, c.ClientIP() = %q, want the network peer %q", got, realClient)
	}
}

// TestHopCountMisreadsTheShorterChain records why TRUSTED_PROXY_HOPS defaults
// to 0: a count tuned for the Cloudflare path reads a forged entry once the
// caller reaches the origin directly.
func TestHopCountMisreadsTheShorterChain(t *testing.T) {
	engine := configuredEngine(t, map[string]string{
		"TRUST_PROXY_HEADERS": "true",
		"TRUSTED_PROXY_HOPS":  "2", // Cloudflare egress + front end
	})

	viaCloudflare := http.Header{"X-Forwarded-For": []string{realClient + ", " + cloudflarePeer}}
	if got := resolveVia(t, engine, frontEndPeer, viaCloudflare); got != realClient {
		t.Fatalf("two-hop chain resolved to %q, want %q", got, realClient)
	}

	bypassingCloudflare := http.Header{"X-Forwarded-For": []string{forged + ", " + attacker}}
	if got := resolveVia(t, engine, frontEndPeer, bypassingCloudflare); got != forged {
		t.Fatalf("one-hop chain resolved to %q; this test exists because a hop "+
			"count reads the forged entry %q on the shorter path", got, forged)
	}
}

// TestUnattributableChainFallsBackToPeer covers the other failure direction:
// when the chain cannot be believed we over-group on the peer rather than
// letting the caller pick a bucket.
func TestUnattributableChainFallsBackToPeer(t *testing.T) {
	env := map[string]string{
		"TRUST_PROXY_HEADERS": "true",
		"TRUSTED_PROXY_CIDRS": frontEndCIDR,
	}
	engine := configuredEngine(t, env)

	for _, tc := range []struct {
		name    string
		headers http.Header
	}{
		{"no forwarding header from a trusted peer", nil},
		{"unparseable hop inside the trusted window", http.Header{"X-Forwarded-For": []string{"not-an-ip"}}},
		{"chain ends inside the trusted range", http.Header{"X-Forwarded-For": []string{"169.254.9.9"}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := resolveVia(t, engine, frontEndPeer, tc.headers); got != frontEndPeer {
				t.Fatalf("resolved to %q, want the peer %q", got, frontEndPeer)
			}
		})
	}
}

func TestConfigureRejectsUnsafeConfiguration(t *testing.T) {
	for _, tc := range []struct {
		name string
		env  map[string]string
	}{
		{"trust without a contract", map[string]string{"TRUST_PROXY_HEADERS": "true"}},
		{"invalid trusted CIDR", map[string]string{"TRUST_PROXY_HEADERS": "true", "TRUSTED_PROXY_CIDRS": "203.0.113.7"}},
		{"invalid cloudflare CIDR", map[string]string{"TRUST_PROXY_HEADERS": "true", "CLOUDFLARE_PROXY_CIDRS": "nonsense"}},
		{"negative hops", map[string]string{"TRUST_PROXY_HEADERS": "true", "TRUSTED_PROXY_HOPS": "-1"}},
		{"non-numeric hops", map[string]string{"TRUST_PROXY_HEADERS": "true", "TRUSTED_PROXY_HOPS": "two"}},
		{"cloudflare ranges without trust", map[string]string{"CLOUDFLARE_PROXY_CIDRS": cloudflareCIDR}},
		{"trusted ranges without trust", map[string]string{"TRUSTED_PROXY_CIDRS": frontEndCIDR}},
		{"hops without trust", map[string]string{"TRUSTED_PROXY_HOPS": "2"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			setEnv(t, tc.env)
			restoreConfigured(t)
			if err := Configure(gin.New()); err == nil {
				t.Fatalf("Configure(%v) = nil, want an error", tc.env)
			}
		})
	}
}

// --- helpers ---

func configuredEngine(t *testing.T, env map[string]string) *gin.Engine {
	t.Helper()
	setEnv(t, env)
	restoreConfigured(t)

	engine := gin.New()
	if err := Configure(engine); err != nil {
		t.Fatalf("Configure() error: %v", err)
	}
	return engine
}

// setEnv clears every knob first so a case only sees what it declares.
func setEnv(t *testing.T, env map[string]string) {
	t.Helper()
	for _, key := range []string{"TRUST_PROXY_HEADERS", "TRUSTED_PROXY_CIDRS", "TRUSTED_PROXY_HOPS", "CLOUDFLARE_PROXY_CIDRS"} {
		t.Setenv(key, env[key])
	}
}

func restoreConfigured(t *testing.T) {
	t.Helper()
	previous := configured
	t.Cleanup(func() { configured = previous })
}

// resolveVia drives a real request through the engine so the test covers the
// gin wiring, not just the resolver in isolation.
func resolveVia(t *testing.T, engine *gin.Engine, peer string, headers http.Header) string {
	t.Helper()
	return resolveViaRemoteAddr(t, engine, net.JoinHostPort(peer, "54321"), headers)
}

// resolveViaRemoteAddr takes RemoteAddr verbatim so a test can pin the exact
// wire form net/http hands us, including bracketed IPv6.
func resolveViaRemoteAddr(t *testing.T, engine *gin.Engine, remoteAddr string, headers http.Header) string {
	t.Helper()
	return serve(t, engine, remoteAddr, headers, func(c *gin.Context) string { return BucketKey(c) })
}

func ginClientIPVia(t *testing.T, engine *gin.Engine, peer string, headers http.Header) string {
	t.Helper()
	return serve(t, engine, net.JoinHostPort(peer, "54321"), headers, func(c *gin.Context) string { return c.ClientIP() })
}

var probeCounter atomic.Int64

// serve takes a full RemoteAddr; callers build it with net.JoinHostPort so an
// IPv6 peer gets bracketed instead of concatenated into an unparseable string.
func serve(t *testing.T, engine *gin.Engine, remoteAddr string, headers http.Header, read func(*gin.Context) string) string {
	t.Helper()

	var got string
	path := "/probe/" + strconv.FormatInt(probeCounter.Add(1), 10)
	engine.GET(path, func(c *gin.Context) {
		got = read(c)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.RemoteAddr = remoteAddr
	for key, values := range headers {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}
	engine.ServeHTTP(httptest.NewRecorder(), req)
	return got
}

func withForgedPrefix(headers http.Header, prefix string) http.Header {
	out := cloneHeader(headers)
	if honest := strings.Join(out.Values("X-Forwarded-For"), ", "); honest != "" {
		out.Set("X-Forwarded-For", prefix+", "+honest)
	} else {
		out.Set("X-Forwarded-For", prefix)
	}
	return out
}

func cloneHeader(headers http.Header) http.Header {
	if headers == nil {
		return http.Header{}
	}
	return headers.Clone()
}
