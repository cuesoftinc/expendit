package sweep

import (
	"testing"
	"time"
)

func TestHeartbeatDueFourTimesADay(t *testing.T) {
	due := 0
	start := time.Date(2026, 10, 13, 0, 0, 0, 0, time.UTC)
	// Every reaper run (*/5) over one day.
	for m := 0; m < 24*60; m += 5 {
		if HeartbeatDue(start.Add(time.Duration(m) * time.Minute)) {
			due++
		}
	}
	if due != 4 {
		t.Fatalf("heartbeats per day = %d, want 4", due)
	}
	if HeartbeatDue(time.Date(2026, 10, 13, 6, 5, 0, 0, time.UTC)) {
		t.Fatal("06:05 is past the window")
	}
}
