package handler

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// RunJob runs the named scheduled job; the caller guards the route.
func RunJob(jobs map[string]func(context.Context) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		name := r.PathValue("name")
		job := jobs[name]
		if job == nil {
			writeError(w, http.StatusNotFound, "not_found", "Not found", nil)
			return
		}
		start := time.Now()
		if err := job(r.Context()); err != nil {
			slog.ErrorContext(r.Context(), "job failed", "job", name, "error", err)
			writeError(w, http.StatusInternalServerError, "internal", "Something went wrong", nil)
			return
		}
		ms := time.Since(start).Milliseconds()
		slog.InfoContext(r.Context(), "job done", "job", name, "ms", ms)
		writeJSON(w, http.StatusOK, map[string]any{"job": name, "ms": ms})
	}
}
