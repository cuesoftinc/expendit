// Package logging builds the service's stdout logger.
package logging

import (
	"io"
	"log/slog"
	"strings"
)

// New returns a JSON logger filtered at level (LOG_LEVEL; info when unset) whose
// lines carry Cloud Logging's severity and message in place of slog's level and msg.
func New(w io.Writer, level string) *slog.Logger {
	return slog.New(slog.NewJSONHandler(w, &slog.HandlerOptions{
		Level:       ParseLevel(level),
		ReplaceAttr: cloudLogging,
	}))
}

// ParseLevel reads debug, info, warn or error; anything else is info.
func ParseLevel(level string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// Cloud Logging reads severity and message from a JSON line; a line without a severity is filed as debug.
func cloudLogging(groups []string, a slog.Attr) slog.Attr {
	if len(groups) > 0 {
		return a
	}
	switch a.Key {
	case slog.MessageKey:
		return slog.Attr{Key: "message", Value: a.Value}
	case slog.LevelKey:
		return severity(a.Value)
	}
	return a
}

func severity(v slog.Value) slog.Attr {
	level, _ := v.Any().(slog.Level)
	switch {
	case level >= slog.LevelError:
		return slog.String("severity", "ERROR")
	case level >= slog.LevelWarn:
		return slog.String("severity", "WARNING")
	case level >= slog.LevelInfo:
		return slog.String("severity", "INFO")
	default:
		return slog.String("severity", "DEBUG")
	}
}
