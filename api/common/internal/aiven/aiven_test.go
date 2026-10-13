package aiven

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func fake(t *testing.T, state string, puts *[]map[string]any) *Client {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/project/proj/service/kafka-x" || r.Header.Get("Authorization") != "aivenv1 tok" {
			t.Errorf("unexpected request %s %s auth=%q", r.Method, r.URL.Path, r.Header.Get("Authorization"))
		}
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(map[string]any{"service": map[string]any{"state": state}})
		case http.MethodPut:
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			*puts = append(*puts, body)
			_ = json.NewEncoder(w).Encode(map[string]any{"service": map[string]any{"state": "REBUILDING"}})
		}
	}))
	t.Cleanup(srv.Close)
	c := New("tok", "proj", "kafka-x")
	c.BaseURL = srv.URL
	return c
}

func TestPowersOnWhenOff(t *testing.T) {
	var puts []map[string]any
	state, on, err := fake(t, "POWEROFF", &puts).EnsurePowered(context.Background())
	if err != nil || state != "POWEROFF" || !on {
		t.Fatalf("state=%s on=%v err=%v", state, on, err)
	}
	if len(puts) != 1 || puts[0]["powered"] != true {
		t.Fatalf("expected one PUT {powered:true}, got %v", puts)
	}
}

func TestLeavesRunningAndRebuildingAlone(t *testing.T) {
	for _, s := range []string{"RUNNING", "REBUILDING"} {
		var puts []map[string]any
		state, on, err := fake(t, s, &puts).EnsurePowered(context.Background())
		if err != nil || state != s || on || len(puts) != 0 {
			t.Fatalf("%s: state=%s on=%v err=%v puts=%v", s, state, on, err, puts)
		}
	}
}

func TestOptional(t *testing.T) {
	if New("", "p", "s") != nil || New("t", "", "s") != nil || New("t", "p", "") != nil {
		t.Fatal("a missing setting must disable the watchdog")
	}
}

func TestErrorsCarryAivensMessage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"message":"Not allowed"}`))
	}))
	defer srv.Close()
	c := New("tok", "proj", "kafka-x")
	c.BaseURL = srv.URL
	if _, _, err := c.EnsurePowered(context.Background()); err == nil || err.Error() != "aiven GET: status 403: Not allowed" {
		t.Fatalf("err = %v", err)
	}
}
