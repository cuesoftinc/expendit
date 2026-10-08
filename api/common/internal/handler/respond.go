// Package handler holds thin HTTP handlers: decode, call a service, encode.
package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/service"
)

// writeJSON encodes v with status.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeError writes the ecosystem envelope {"error": {code, message, details}}.
func writeError(w http.ResponseWriter, status int, code, message string, details map[string]any) {
	if details == nil {
		details = map[string]any{}
	}
	writeJSON(w, status, map[string]any{"error": map[string]any{"code": code, "message": message, "details": details}})
}

// fail maps service and repository errors onto HTTP responses.
func fail(w http.ResponseWriter, r *http.Request, err error) {
	var apiErr *service.Error
	switch {
	case errors.As(err, &apiErr):
		if apiErr.RetryAfter > 0 {
			w.Header().Set("Retry-After", strconv.Itoa(int(apiErr.RetryAfter/time.Second)))
		}
		writeError(w, apiErr.Status, apiErr.Code, apiErr.Message, apiErr.Details)
	case errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "Not found", nil)
	case errors.Is(err, repository.ErrConflict):
		writeError(w, http.StatusConflict, "conflict", "That already exists", nil)
	default:
		slog.ErrorContext(r.Context(), "request failed", "path", r.URL.Path, "error", err)
		writeError(w, http.StatusInternalServerError, "internal", "Something went wrong", nil)
	}
}

// decode reads a JSON body into v, rejecting unknown fields.
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "The request body is not valid JSON for this endpoint", map[string]any{"reason": err.Error()})
		return false
	}
	return true
}
