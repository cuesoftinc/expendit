package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRunJob(t *testing.T) {
	jobs := map[string]func(context.Context) error{
		"reaper": func(context.Context) error { return nil },
		"broken": func(context.Context) error { return errors.New("boom") },
	}
	mux := http.NewServeMux()
	mux.Handle("POST /internal/jobs/{name}", RunJob(jobs))

	cases := []struct {
		name string
		path string
		want int
	}{
		{"unknown", "/internal/jobs/nope", http.StatusNotFound},
		{"known", "/internal/jobs/reaper", http.StatusOK},
		{"failing", "/internal/jobs/broken", http.StatusInternalServerError},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			mux.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, tc.path, nil))
			if rec.Code != tc.want {
				t.Fatalf("status = %d, want %d", rec.Code, tc.want)
			}
			if tc.want != http.StatusOK {
				return
			}
			var body struct {
				Job string `json:"job"`
				MS  *int64 `json:"ms"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Job != "reaper" || body.MS == nil {
				t.Fatalf("body = %s (%v)", rec.Body.String(), err)
			}
		})
	}
}
