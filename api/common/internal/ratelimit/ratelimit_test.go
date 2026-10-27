package ratelimit

import (
	"testing"
	"time"
)

func TestWindowKey(t *testing.T) {
	now := time.Unix(7200+30, 0)
	rule := Rule{Name: "uploads-hour", Max: 10, Window: time.Hour}
	cases := []struct {
		name   string
		prefix string
		want   string
	}{
		{"prefixed", "expendit", "expendit:rl:uploads-hour:org:o1:2"},
		{"no prefix", "", "rl:uploads-hour:org:o1:2"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			l := &Limiter{prefix: tc.prefix}
			if got := l.windowKey(rule, "org:o1", now); got != tc.want {
				t.Fatalf("key = %q, want %q", got, tc.want)
			}
		})
	}
}
