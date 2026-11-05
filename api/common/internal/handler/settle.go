package handler

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// Settle runs one settle and answers whether the consumers caught up; the
// caller guards the route.
func Settle(run func(context.Context) bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		caughtUp := run(r.Context())
		ms := time.Since(start).Milliseconds()
		slog.InfoContext(r.Context(), "settled", "caught_up", caughtUp, "ms", ms)
		writeJSON(w, http.StatusOK, map[string]any{"caught_up": caughtUp, "ms": ms})
	}
}
