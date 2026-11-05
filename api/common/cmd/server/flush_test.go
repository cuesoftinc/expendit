package main

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/wake"
)

// A write is answered only after its outbox rows are published: the client
// must not see a header while the flush is still running.
func TestResponseWaitsForTheFlush(t *testing.T) {
	release := make(chan struct{})
	flushing := make(chan struct{})
	var flushed atomic.Bool
	flush := func(context.Context) {
		close(flushing)
		<-release
		flushed.Store(true)
	}
	h := flushBeforeResponse(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(strings.Repeat("x", 1<<20)))
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
	}), flush)
	srv := httptest.NewServer(h)
	defer srv.Close()

	type result struct {
		res *http.Response
		err error
	}
	done := make(chan result, 1)
	go func() {
		res, err := http.Post(srv.URL+"/api/v1/transactions", "application/json", strings.NewReader("{}"))
		done <- result{res, err}
	}()
	<-flushing
	select {
	case r := <-done:
		t.Fatalf("client got a response (%v, %v) while the outbox flush was still running", r.res, r.err)
	case <-time.After(200 * time.Millisecond):
	}
	close(release)
	r := <-done
	if r.err != nil {
		t.Fatal(r.err)
	}
	defer r.res.Body.Close()
	if !flushed.Load() {
		t.Fatal("response arrived before the flush finished")
	}
	body, _ := io.ReadAll(r.res.Body)
	if r.res.StatusCode != http.StatusCreated || len(body) != 1<<20 {
		t.Fatalf("response = %d with %d bytes; want 201 with the whole body", r.res.StatusCode, len(body))
	}
}

func TestFlushRunsPerRequestKind(t *testing.T) {
	cases := []struct {
		name, method, path string
		queue              bool
		want               int
	}{
		{"write", http.MethodPost, "/api/v1/transactions", false, 1},
		{"patch", http.MethodPatch, "/api/v1/transactions/1", false, 1},
		{"delete", http.MethodDelete, "/api/v1/transactions/1", false, 1},
		{"plain read", http.MethodGet, "/api/v1/transactions", false, 0},
		{"read that queued a computation", http.MethodGet, "/api/v1/ratios", true, 1},
		{"options", http.MethodOptions, "/api/v1/transactions", false, 0},
		{"internal write", http.MethodPost, "/internal/jobs/reaper", false, 0},
		{"internal that queued", http.MethodPost, "/internal/settle", true, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var n int
			h := flushBeforeResponse(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if c.queue {
					repository.NoteQueued(r.Context())
				}
				w.WriteHeader(http.StatusOK)
			}), func(context.Context) { n++ })
			h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(c.method, c.path, nil))
			if n != c.want {
				t.Fatalf("%s %s flushed %d times; want %d", c.method, c.path, n, c.want)
			}
		})
	}
}

// A handler that never writes still flushes before the empty answer.
func TestFlushRunsForAnEmptyAnswer(t *testing.T) {
	var n int
	h := flushBeforeResponse(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}), func(context.Context) { n++ })
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/v1/x", nil))
	if n != 1 {
		t.Fatalf("flushed %d times; want 1", n)
	}
}

// The flush outlives a client that hangs up: the rows are already committed.
func TestFlushSurvivesTheClientLeaving(t *testing.T) {
	var ctxErr error
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/x", nil).WithContext(ctx)
	h := flushBeforeResponse(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}), func(c context.Context) { ctxErr = c.Err() })
	h.ServeHTTP(httptest.NewRecorder(), req)
	if ctxErr != nil {
		t.Fatalf("flush context ended with the request: %v", ctxErr)
	}
}

type fakeFlusher struct {
	sent  int
	err   error
	calls int
}

func (f *fakeFlusher) Flush(context.Context) (int, error) { f.calls++; return f.sent, f.err }

func TestFlushOutboxDrainsOnlyWhenSomethingWasPublished(t *testing.T) {
	for _, tc := range []struct {
		name  string
		sent  int
		drain int
	}{{"rows published", 3, 1}, {"nothing queued", 0, 0}} {
		t.Run(tc.name, func(t *testing.T) {
			var drained int
			flush := flushOutbox(publishOutbox(&fakeFlusher{sent: tc.sent}), func(context.Context) error { drained++; return nil })
			flush(context.Background())
			if drained != tc.drain {
				t.Fatalf("drains = %d, want %d", drained, tc.drain)
			}
		})
	}
}

func TestPublishOutboxSurvivesAFailure(t *testing.T) {
	f := &fakeFlusher{err: errors.New("kafka away")}
	if n := publishOutbox(f)(context.Background()); n != 0 || f.calls != 1 {
		t.Fatalf("published %d in %d calls; want one attempt and no spin", n, f.calls)
	}
}

// What a flush published is settled at the service that consumes it, once.
func TestSettleConsumersSettlesEachServiceOnce(t *testing.T) {
	var extract, compute atomic.Int32
	extractSrv := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/internal/settle" {
			t.Errorf("extract got %s %s", r.Method, r.URL.Path)
		}
		extract.Add(1)
	}))
	defer extractSrv.Close()
	computeSrv := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { compute.Add(1) }))
	defer computeSrv.Close()

	w := wake.New()
	settle := settleConsumers(w, map[string]string{
		"expendit.import.ready":      extractSrv.URL,
		"expendit.statement.ready":   extractSrv.URL,
		"expendit.compute.requested": computeSrv.URL,
	})
	settle(context.Background(), map[string]int{"expendit.import.ready": 2, "expendit.statement.ready": 1})
	if extract.Load() != 1 || compute.Load() != 0 {
		t.Fatalf("extract=%d compute=%d; want one extract settle and no compute settle", extract.Load(), compute.Load())
	}
	settle(context.Background(), map[string]int{"expendit.compute.requested": 1, "expendit.unknown": 1})
	if compute.Load() != 1 {
		t.Fatalf("compute=%d; want one compute settle", compute.Load())
	}
}

type fakeWaiter struct {
	err   error
	calls atomic.Int32
}

func (f *fakeWaiter) WaitCaughtUp(context.Context, time.Duration) error { f.calls.Add(1); return f.err }

func TestDrainAllWaitsForEveryConsumer(t *testing.T) {
	a, b := &fakeWaiter{}, &fakeWaiter{err: errors.New("results behind")}
	err := drainAll([]waiter{a, b})(context.Background())
	if a.calls.Load() != 1 || b.calls.Load() != 1 {
		t.Fatalf("calls = %d, %d; want every consumer waited on", a.calls.Load(), b.calls.Load())
	}
	if err == nil || !strings.Contains(err.Error(), "results behind") {
		t.Fatalf("err = %v; want the lagging consumer reported", err)
	}
}

// One settle: drain what is waiting, publish and settle downstream, drain again.
func TestSettleDrainsPublishesThenDrainsAgain(t *testing.T) {
	var order []string
	s := settler{
		drain:   func(context.Context) error { order = append(order, "drain"); return nil },
		publish: func(context.Context) int { order = append(order, "publish"); return 1 },
		budget:  time.Second,
	}
	if !s.run(context.Background()) {
		t.Fatal("settle reported not caught up though every drain succeeded")
	}
	if got := strings.Join(order, " "); got != "drain publish drain" {
		t.Fatalf("order = %q; want %q", got, "drain publish drain")
	}
}

func TestSettleReportsWhenConsumersAreStillBehind(t *testing.T) {
	calls := 0
	s := settler{
		drain: func(context.Context) error {
			calls++
			if calls == 2 {
				return errors.New("behind")
			}
			return nil
		},
		publish: func(context.Context) int { return 0 },
		budget:  time.Second,
	}
	if s.run(context.Background()) {
		t.Fatal("settle reported caught up though the last drain failed")
	}
}

// Each phase ends at its share of the budget, so a slow downstream settle
// cannot starve the final drain.
func TestSettlePhasesEndInsideTheBudget(t *testing.T) {
	budget := 400 * time.Millisecond
	var deadlines []time.Time
	var final time.Time
	calls := 0
	s := settler{
		drain: func(ctx context.Context) error {
			calls++
			d, _ := ctx.Deadline()
			if calls == 1 {
				deadlines = append(deadlines, d)
			} else {
				final = d
			}
			return nil
		},
		publish: func(ctx context.Context) int {
			d, _ := ctx.Deadline()
			deadlines = append(deadlines, d)
			<-ctx.Done()
			return 0
		},
		budget: budget,
	}
	start := time.Now()
	s.run(context.Background())
	if len(deadlines) != 2 || !deadlines[0].Before(deadlines[1]) || !deadlines[1].Before(final) {
		t.Fatalf("deadlines %v then %v: want drain < publish < final drain", deadlines, final)
	}
	if time.Since(start) > budget+200*time.Millisecond {
		t.Fatalf("settle took %s with a %s budget", time.Since(start), budget)
	}
}
