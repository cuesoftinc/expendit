package sweep

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/config"
	"github.com/cuesoftinc/expendit/api/common/internal/wake"
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

// settleLog records the order in which the settles reach their targets.
type settleLog struct {
	mu    sync.Mutex
	order []string
}

func (l *settleLog) add(name string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.order = append(l.order, name)
}

func (l *settleLog) reset() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.order = nil
}

func (l *settleLog) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return strings.Join(l.order, " ")
}

func target(t *testing.T, l *settleLog, name string) string {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/internal/settle" {
			t.Errorf("%s got %s %s; want POST /internal/settle", name, r.Method, r.URL.Path)
		}
		l.add(name)
	}))
	t.Cleanup(srv.Close)
	return srv.URL
}

// The reaper settles the services that have work, then common's own consumers.
func TestReaperSettlesPendingServicesThenCommon(t *testing.T) {
	var l settleLog
	s := &Sweeper{
		Wake:     wake.New(),
		WakeURLs: config.Wake{Extract: target(t, &l, "extract"), Compute: target(t, &l, "compute")},
		Settle:   func(context.Context) error { l.add("common"); return nil },
	}
	s.settle(context.Background(), time.Now(), false, true, false)
	if l.String() != "extract common" {
		t.Fatalf("settles = %q; want extract then common, and no compute settle without a pending compute request", l.String())
	}

	l.reset()
	s.settle(context.Background(), time.Now(), true, true, true)
	if got := l.String(); got != "compute extract common" && got != "extract compute common" {
		t.Fatalf("settles = %q; want both services before common", got)
	}
}

func TestReaperSettlesCommonEvenWithNothingPendingElsewhere(t *testing.T) {
	var l settleLog
	s := &Sweeper{Settle: func(context.Context) error { l.add("common"); return nil }}
	s.settle(context.Background(), time.Now(), false, false, false)
	if l.String() != "common" {
		t.Fatalf("settles = %q; want common's own consumers drained", l.String())
	}
}

// Settles stop before Cloud Scheduler's 60 s attempt deadline.
func TestReaperSettlesEndInsideTheAttemptDeadline(t *testing.T) {
	start := time.Now()
	var deadline time.Time
	s := &Sweeper{Settle: func(ctx context.Context) error {
		deadline, _ = ctx.Deadline()
		return nil
	}}
	s.settle(context.Background(), start, false, false, false)
	if deadline.IsZero() || deadline.After(start.Add(60*time.Second)) {
		t.Fatalf("settle deadline %v is not inside 60 s of the job start %v", deadline, start)
	}
}

func TestReaperGoesOnWhenACommonSettleFails(t *testing.T) {
	s := &Sweeper{Settle: func(context.Context) error { return errors.New("still behind") }}
	s.settle(context.Background(), time.Now(), true, false, false)
}
