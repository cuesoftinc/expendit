package clientip

import (
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
	return serve(t, engine, peer, headers, func(c *gin.Context) string { return Resolve(c) })
}

func ginClientIPVia(t *testing.T, engine *gin.Engine, peer string, headers http.Header) string {
	t.Helper()
	return serve(t, engine, peer, headers, func(c *gin.Context) string { return c.ClientIP() })
}

var probeCounter atomic.Int64

func serve(t *testing.T, engine *gin.Engine, peer string, headers http.Header, read func(*gin.Context) string) string {
	t.Helper()

	var got string
	path := "/probe/" + strconv.FormatInt(probeCounter.Add(1), 10)
	engine.GET(path, func(c *gin.Context) {
		got = read(c)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.RemoteAddr = peer + ":54321"
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
