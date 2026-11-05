package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/wake"
)

const (
	// flushTimeout bounds publishing, settling the consumer services and
	// draining before a response.
	flushTimeout = 60 * time.Second
	// requestDrain bounds the wait for common's own consumers after a flush.
	requestDrain = 20 * time.Second
	// settleBudget bounds one settle of common; it ends inside the 45 s that
	// statements and the services' wake clients wait.
	settleBudget = 40 * time.Second
)

// flusher is the slice of the outbox publisher a flush needs.
type flusher interface {
	Flush(ctx context.Context) (int, error)
}

// publishOutbox publishes the outbox and settles the services that consume
// what it sent, and reports how many rows went out; a failure leaves the rest
// for the next flush.
func publishOutbox(p flusher) func(context.Context) int {
	return func(ctx context.Context) int {
		n, err := p.Flush(ctx)
		if err != nil {
			slog.WarnContext(ctx, "outbox flush failed; the next pass retries", "error", err)
		}
		return n
	}
}

// flushOutbox publishes, then waits for common's own consumers to handle what
// the consumer services sent back; with nothing published there is nothing to
// wait for.
func flushOutbox(publish func(context.Context) int, drain func(context.Context) error) func(context.Context) {
	return func(ctx context.Context) {
		if publish(ctx) == 0 {
			return
		}
		dctx, cancel := context.WithTimeout(ctx, requestDrain)
		defer cancel()
		if err := drain(dctx); err != nil {
			slog.WarnContext(ctx, "results not all handled; the next pass continues", "error", err)
		}
	}
}

// settleConsumers settles the service that consumes each event a flush sent.
func settleConsumers(w *wake.Waker, serviceFor map[string]string) func(context.Context, map[string]int) {
	return func(ctx context.Context, sent map[string]int) {
		bases := make([]string, 0, len(sent))
		for event := range sent {
			bases = append(bases, serviceFor[event])
		}
		w.SettleAll(ctx, "outbox", bases...)
	}
}

// waiter is the slice of a consumer a drain needs.
type waiter interface {
	WaitCaughtUp(ctx context.Context, within time.Duration) error
}

// drainAll waits, until ctx ends, for every consumer to commit what is on its
// topic.
func drainAll(consumers []waiter) func(context.Context) error {
	return func(ctx context.Context) error {
		within := requestDrain
		if d, ok := ctx.Deadline(); ok {
			within = time.Until(d)
		}
		errs := make([]error, len(consumers))
		var wg sync.WaitGroup
		for i, c := range consumers {
			wg.Add(1)
			go func() {
				defer wg.Done()
				errs[i] = c.WaitCaughtUp(ctx, within)
			}()
		}
		wg.Wait()
		return errors.Join(errs...)
	}
}

// settler is one settle of common: drain what is waiting, publish what the
// handlers queued and settle the services that consume it, then drain what
// they sent back. Each phase ends at its share of the budget.
type settler struct {
	drain   func(context.Context) error
	publish func(context.Context) int
	budget  time.Duration
}

// run reports whether the consumers had caught up when the budget ended.
func (s settler) run(ctx context.Context) bool {
	start := time.Now()
	ctx, cancel := context.WithTimeout(ctx, s.budget)
	defer cancel()

	first, cancelFirst := context.WithDeadline(ctx, start.Add(s.budget*3/10))
	if err := s.drain(first); err != nil {
		slog.WarnContext(ctx, "consumers still behind before the publish", "step", "settle", "error", err)
	}
	cancelFirst()

	mid, cancelMid := context.WithDeadline(ctx, start.Add(s.budget*7/10))
	s.publish(mid)
	cancelMid()

	if err := s.drain(ctx); err != nil {
		slog.WarnContext(ctx, "consumers still behind at the end of the settle", "step", "settle", "error", err)
		return false
	}
	return true
}

// commitWriter runs before once, ahead of the response's first byte.
type commitWriter struct {
	http.ResponseWriter
	before func()
	done   bool
}

func (c *commitWriter) commit() {
	if !c.done {
		c.done = true
		c.before()
	}
}

func (c *commitWriter) WriteHeader(code int) {
	c.commit()
	c.ResponseWriter.WriteHeader(code)
}

func (c *commitWriter) Write(b []byte) (int, error) {
	c.commit()
	return c.ResponseWriter.Write(b)
}

func (c *commitWriter) Flush() {
	c.commit()
	if f, ok := c.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (c *commitWriter) Unwrap() http.ResponseWriter { return c.ResponseWriter }

// flushBeforeResponse publishes the outbox rows a request created before the
// first byte of its response, while the instance still has CPU: after every
// write, and after a read that queued rows. /internal/ routes flush inside
// their own pass.
func flushBeforeResponse(next http.Handler, flush func(context.Context)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/internal/") {
			next.ServeHTTP(w, r)
			return
		}
		ctx, queued := repository.WithQueued(r.Context())
		r = r.WithContext(ctx)
		safe := r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions
		cw := &commitWriter{ResponseWriter: w, before: func() {
			if safe && !queued.Any() {
				return
			}
			fctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), flushTimeout)
			defer cancel()
			flush(fctx)
		}}
		next.ServeHTTP(cw, r)
		cw.commit()
	})
}
