// Package service holds the CRUD rules: authorization, lookups, writes and
// hand-offs. Every decision about financial data is analytics' (S-7);
// services here only store what it returns.
package service

import (
	"fmt"
	"net/http"
	"time"
)

// Error is a client-facing error with a stable code (engineering.md §1).
type Error struct {
	Status     int
	Code       string
	Message    string
	Details    map[string]any
	RetryAfter time.Duration
}

func (e *Error) Error() string { return fmt.Sprintf("%d %s: %s", e.Status, e.Code, e.Message) }

func newErr(status int, code, message string) *Error {
	return &Error{Status: status, Code: code, Message: message}
}

var (
	ErrForbidden = newErr(http.StatusForbidden, "forbidden", "Your role in this organization can't do that")
	ErrNotFound  = newErr(http.StatusNotFound, "not_found", "Not found")
)

func invalid(message string, details map[string]any) *Error {
	return &Error{Status: http.StatusUnprocessableEntity, Code: "validation_failed", Message: message, Details: details}
}
