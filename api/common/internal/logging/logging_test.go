package logging

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"testing"
)

func TestEveryLevelCarriesItsCloudLoggingSeverity(t *testing.T) {
	cases := []struct {
		level slog.Level
		want  string
	}{
		{slog.LevelDebug, "DEBUG"},
		{slog.LevelInfo, "INFO"},
		{slog.LevelWarn, "WARNING"},
		{slog.LevelError, "ERROR"},
		{slog.LevelError + 4, "ERROR"},
	}
	for _, c := range cases {
		var out bytes.Buffer
		New(&out, "debug").Log(t.Context(), c.level, "line", "status", 500)
		var rec map[string]any
		if err := json.Unmarshal(out.Bytes(), &rec); err != nil {
			t.Fatalf("%v: not one JSON line: %v", c.level, err)
		}
		if rec["severity"] != c.want {
			t.Fatalf("%v: severity %v, want %s", c.level, rec["severity"], c.want)
		}
		for _, key := range []string{"level", "msg"} {
			if _, ok := rec[key]; ok {
				t.Fatalf("%v: line still carries slog's %s key: %q", c.level, key, out.String())
			}
		}
		if rec["message"] != "line" || rec["status"] != float64(500) {
			t.Fatalf("%v: message or attributes lost: %q", c.level, out.String())
		}
	}
}

func TestAGroupedAttributeNamedLevelOrMsgIsLeftAlone(t *testing.T) {
	var out bytes.Buffer
	New(&out, "info").WithGroup("job").Info("ran", "level", "high", "msg", "kept")
	var rec struct {
		Severity string            `json:"severity"`
		Message  string            `json:"message"`
		Job      map[string]string `json:"job"`
	}
	if err := json.Unmarshal(out.Bytes(), &rec); err != nil {
		t.Fatal(err)
	}
	if rec.Severity != "INFO" || rec.Message != "ran" || rec.Job["level"] != "high" || rec.Job["msg"] != "kept" {
		t.Fatalf("grouped attribute rewritten: %q", out.String())
	}
}

func TestTheLevelFloorFollowsLogLevel(t *testing.T) {
	cases := []struct {
		env      string
		debugOut bool
		infoOut  bool
	}{
		{"", false, true},
		{"info", false, true},
		{"DEBUG", true, true},
		{"warn", false, false},
		{"nonsense", false, true},
	}
	for _, c := range cases {
		var out bytes.Buffer
		log := New(&out, c.env)
		log.Debug("d")
		if (out.Len() > 0) != c.debugOut {
			t.Fatalf("LOG_LEVEL=%q: debug written %v, want %v", c.env, out.Len() > 0, c.debugOut)
		}
		out.Reset()
		log.Info("i")
		if (out.Len() > 0) != c.infoOut {
			t.Fatalf("LOG_LEVEL=%q: info written %v, want %v", c.env, out.Len() > 0, c.infoOut)
		}
	}
}
