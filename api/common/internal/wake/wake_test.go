package wake

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestSettlePostsToInternalSettle(t *testing.T) {
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/internal/settle" || r.Header.Get("Authorization") != "" {
			t.Errorf("unexpected request %s %s auth=%q", r.Method, r.URL.Path, r.Header.Get("Authorization"))
		}
		hits.Add(1)
	}))
	defer srv.Close()

	w := New()
	w.idTokens = false
	if err := w.Settle(context.Background(), srv.URL+"/", "test"); err != nil {
		t.Fatal(err)
	}
	if hits.Load() != 1 {
		t.Fatalf("hits = %d", hits.Load())
	}
}

func TestSettleSignsWithAnIDTokenForTheTarget(t *testing.T) {
	var target *httptest.Server
	var got string
	target = httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { got = r.Header.Get("Authorization") }))
	defer target.Close()
	meta := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Metadata-Flavor") != "Google" || r.URL.Query().Get("audience") != target.URL {
			t.Errorf("metadata request %s flavor=%q", r.URL.String(), r.Header.Get("Metadata-Flavor"))
		}
		_, _ = w.Write([]byte("tok\n"))
	}))
	defer meta.Close()

	w := New()
	w.idTokens, w.identity = true, meta.URL
	if err := w.Settle(context.Background(), target.URL, "test"); err != nil {
		t.Fatal(err)
	}
	if got != "Bearer tok" {
		t.Fatalf("authorization = %q, want the metadata token", got)
	}
}

func TestSettleDoesNothingWithoutABase(t *testing.T) {
	w := New()
	w.idTokens = false
	if err := w.Settle(context.Background(), "", "nothing configured"); err != nil {
		t.Fatal(err)
	}
}

func TestSettleReportsAFailedAnswer(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	w := New()
	w.idTokens = false
	if err := w.Settle(context.Background(), srv.URL, "test"); err == nil {
		t.Fatal("expected an error for a 503")
	}
}

// The caller answers its own request only after the target finished settling.
func TestSettleAllWaitsForEveryTarget(t *testing.T) {
	var done atomic.Int32
	slow := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		time.Sleep(150 * time.Millisecond)
		done.Add(1)
	}))
	defer slow.Close()
	var other atomic.Int32
	quick := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { other.Add(1) }))
	defer quick.Close()

	w := New()
	w.idTokens = false
	w.SettleAll(context.Background(), "test", slow.URL, "", slow.URL, quick.URL)
	if done.Load() != 1 || other.Load() != 1 {
		t.Fatalf("slow=%d quick=%d: want one settle per distinct target, all finished before return", done.Load(), other.Load())
	}
}
