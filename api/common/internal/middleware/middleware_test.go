package middleware

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequestLineLevelFollowsTheStatus(t *testing.T) {
	prev := slog.Default()
	t.Cleanup(func() { slog.SetDefault(prev) })
	cases := []struct {
		method string
		status int
		want   string
	}{
		{http.MethodGet, http.StatusOK, "INFO"},
		{http.MethodPost, http.StatusNoContent, "INFO"},
		{http.MethodGet, http.StatusFound, "INFO"},
		{http.MethodOptions, http.StatusNoContent, "DEBUG"},
		{http.MethodOptions, http.StatusForbidden, "WARN"},
		{http.MethodGet, http.StatusUnauthorized, "WARN"},
		{http.MethodGet, http.StatusNotFound, "WARN"},
		{http.MethodPost, http.StatusInternalServerError, "ERROR"},
		{http.MethodGet, http.StatusBadGateway, "ERROR"},
	}
	for _, c := range cases {
		var out bytes.Buffer
		slog.SetDefault(slog.New(slog.NewJSONHandler(&out, &slog.HandlerOptions{Level: slog.LevelDebug})))
		h := Logger(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(c.status) }))
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(c.method, "/api/v1/imports", nil))
		var line struct {
			Level  string `json:"level"`
			Msg    string `json:"msg"`
			Status int    `json:"status"`
		}
		if err := json.Unmarshal(out.Bytes(), &line); err != nil {
			t.Fatalf("%s %d: request line is not one JSON record: %v", c.method, c.status, err)
		}
		if line.Msg != "request" || line.Status != c.status || line.Level != c.want {
			t.Fatalf("%s %d: got level %s msg %q status %d, want level %s", c.method, c.status, line.Level, line.Msg, line.Status, c.want)
		}
	}
}

func TestHealthChecksWriteNoRequestLine(t *testing.T) {
	prev := slog.Default()
	t.Cleanup(func() { slog.SetDefault(prev) })
	var out bytes.Buffer
	slog.SetDefault(slog.New(slog.NewJSONHandler(&out, &slog.HandlerOptions{Level: slog.LevelDebug})))
	h := Logger(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusServiceUnavailable) }))
	for _, path := range []string{"/health", "/ready"} {
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, path, nil))
	}
	if out.Len() != 0 {
		t.Fatalf("health checks wrote request lines: %q", out.String())
	}
}
