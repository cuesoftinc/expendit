package wake

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestNowCallsHealth(t *testing.T) {
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" || r.Header.Get("Authorization") != "" {
			t.Errorf("unexpected request %s auth=%q", r.URL.Path, r.Header.Get("Authorization"))
		}
		hits.Add(1)
	}))
	defer srv.Close()

	w := New()
	w.idTokens = false
	if err := w.Now(context.Background(), srv.URL+"/", "test"); err != nil {
		t.Fatal(err)
	}
	if hits.Load() != 1 {
		t.Fatalf("hits = %d", hits.Load())
	}
}

func TestAsyncDebouncesAndSkipsEmpty(t *testing.T) {
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { hits.Add(1) }))
	defer srv.Close()

	w := New()
	w.idTokens = false
	w.Async("", "nothing configured")
	for range 3 {
		w.Async(srv.URL, "test")
	}
	deadline := time.Now().Add(2 * time.Second)
	for hits.Load() == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	time.Sleep(50 * time.Millisecond)
	if hits.Load() != 1 {
		t.Fatalf("hits = %d, want 1 (debounced)", hits.Load())
	}
}

func TestFailedWakeIsRetriedNextTime(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	w := New()
	w.idTokens = false
	if !w.due(srv.URL) {
		t.Fatal("first wake should be due")
	}
	if err := w.Now(context.Background(), srv.URL, "test"); err == nil {
		t.Fatal("expected an error for a 503")
	}
	if !w.due(srv.URL) {
		t.Fatal("a failed wake must not hold back the next one")
	}
}
