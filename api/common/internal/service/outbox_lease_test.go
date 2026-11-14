package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	kgo "github.com/segmentio/kafka-go"

	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/outbox"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

// sender is an outbox.Sender that fails the test when it is called while the
// publisher holds a pooled connection.
type sender struct {
	e    *env
	t    *testing.T
	sent []string
	fail error
	// stall, when set, makes Write signal on entered and wait for stall to close.
	stall   chan struct{}
	entered chan struct{}
}

func (s *sender) Message(_ context.Context, out kafka.Outgoing) (kgo.Message, error) {
	s.held("message")
	return kgo.Message{Topic: out.Event, Key: []byte(out.Key), Value: out.Data}, nil
}

func (s *sender) Write(_ context.Context, msgs ...kgo.Message) error {
	s.held("write")
	if s.stall != nil {
		s.entered <- struct{}{}
		<-s.stall
	}
	if s.fail != nil {
		return s.fail
	}
	for _, m := range msgs {
		s.sent = append(s.sent, string(m.Key))
	}
	return nil
}

func (s *sender) held(op string) {
	if n := s.e.db.Pool.Stat().AcquiredConns(); n != 0 {
		s.t.Errorf("outbox %s while %d pooled connection(s) are held", op, n)
	}
}

func (e *env) enqueue(t *testing.T, keys ...string) {
	ctx := context.Background()
	if err := e.db.AsSystem(ctx, func(tx pgx.Tx) error {
		for _, k := range keys {
			if _, err := repository.Enqueue(ctx, tx, "test.event", k, "", map[string]string{"k": k}); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
}

func (e *env) unsent(t *testing.T) (n int) {
	err := e.db.AsSystem(context.Background(), func(tx pgx.Tx) error {
		return tx.QueryRow(context.Background(), `SELECT count(*) FROM outbox WHERE published_at IS NULL`).Scan(&n)
	})
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func TestOutboxPublishHoldsNoConnection(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	snd := &sender{e: e, t: t}
	var woke map[string]int
	pub := &outbox.Publisher{DB: e.db, Producer: snd, Interval: time.Hour,
		Wake: func(_ context.Context, sent map[string]int) { woke = sent }}

	e.enqueue(t, "a", "b", "c")
	n, err := pub.Flush(ctx)
	if err != nil || n != 3 || len(snd.sent) != 3 || woke["test.event"] != 3 {
		t.Fatalf("flush: n=%d err=%v sent=%v woke=%v", n, err, snd.sent, woke)
	}
	if got := e.unsent(t); got != 0 {
		t.Fatalf("%d rows left unsent after a successful flush", got)
	}
	if n, err := pub.Flush(ctx); err != nil || n != 0 {
		t.Fatalf("empty queue: n=%d err=%v", n, err)
	}
}

func TestOutboxFailedSendKeepsRowsAndOrder(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	snd := &sender{e: e, t: t, fail: errors.New("kafka down")}
	pub := &outbox.Publisher{DB: e.db, Producer: snd, Interval: time.Hour}

	e.enqueue(t, "a", "b", "c")
	if n, err := pub.Flush(ctx); err == nil || n != 0 {
		t.Fatalf("a failed send must report the error: n=%d err=%v", n, err)
	}
	if got := e.unsent(t); got != 3 {
		t.Fatalf("a failed send lost rows: %d unsent, want 3", got)
	}
	// The lease was released, so the next pass retries at once, in order.
	snd.fail = nil
	n, err := pub.Flush(ctx)
	if err != nil || n != 3 || len(snd.sent) != 3 || snd.sent[0] != "a" || snd.sent[1] != "b" || snd.sent[2] != "c" {
		t.Fatalf("retry: n=%d err=%v sent=%v", n, err, snd.sent)
	}
	if got := e.unsent(t); got != 0 {
		t.Fatalf("%d rows left unsent after the retry", got)
	}
}

func TestOutboxLeaseSkipsLeasedAndRetakesLapsed(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	e.enqueue(t, "a", "b")
	lease := func(d time.Duration) (rows []repository.OutboxRow) {
		if err := e.db.AsSystem(ctx, func(tx pgx.Tx) (err error) {
			rows, err = repository.LeaseOutbox(ctx, tx, 10, d, "t")
			return err
		}); err != nil {
			t.Fatal(err)
		}
		return rows
	}
	first := lease(time.Hour)
	if len(first) != 2 || first[0].Key != "a" || first[1].Key != "b" {
		t.Fatalf("first lease: %+v", first)
	}
	if again := lease(time.Hour); len(again) != 0 {
		t.Fatalf("a leased row was leased twice: %+v", again)
	}
	// A crashed publisher's lease lapses and the rows come back, unsent.
	if err := e.db.AsSystem(ctx, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `UPDATE outbox SET lease_until = now() - interval '1 second'`)
		return err
	}); err != nil {
		t.Fatal(err)
	}
	if retaken := lease(time.Hour); len(retaken) != 2 {
		t.Fatalf("lapsed lease not retaken: %+v", retaken)
	}
}

func TestOutboxOwnerTokenGuardsReleaseAndMark(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	e.enqueue(t, "a")
	lease := func(owner string) []repository.OutboxRow {
		var rows []repository.OutboxRow
		if err := e.db.AsSystem(ctx, func(tx pgx.Tx) (err error) {
			rows, err = repository.LeaseOutbox(ctx, tx, 10, time.Hour, owner)
			return err
		}); err != nil {
			t.Fatal(err)
		}
		return rows
	}
	system := func(fn func(tx pgx.Tx) error) {
		if err := e.db.AsSystem(ctx, fn); err != nil {
			t.Fatal(err)
		}
	}
	first := lease("old")
	if len(first) != 1 {
		t.Fatalf("lease: %+v", first)
	}
	// The old pass stalls; its lease lapses and a new pass takes the row.
	system(func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `UPDATE outbox SET lease_until = now() - interval '1 second'`)
		return err
	})
	if got := lease("new"); len(got) != 1 {
		t.Fatalf("new pass lease: %+v", got)
	}
	ids := []int64{first[0].ID}
	system(func(tx pgx.Tx) error { return repository.ReleaseOutbox(ctx, tx, ids, "old") })
	if again := lease("third"); len(again) != 0 {
		t.Fatalf("a late release freed another pass's lease: %+v", again)
	}
	system(func(tx pgx.Tx) error { return repository.MarkPublished(ctx, tx, ids, "old") })
	if got := e.unsent(t); got != 1 {
		t.Fatalf("a late mark published another pass's row: %d unsent", got)
	}
	system(func(tx pgx.Tx) error { return repository.MarkPublished(ctx, tx, ids, "new") })
	if got := e.unsent(t); got != 0 {
		t.Fatalf("the owner's mark did not publish: %d unsent", got)
	}
}

// A caller waiting behind a stuck send stops when its context ends instead of
// waiting out the send.
func TestOutboxWaiterStopsWithItsContext(t *testing.T) {
	e := setup(t)
	snd := &sender{e: e, t: t, stall: make(chan struct{}), entered: make(chan struct{}, 1)}
	pub := &outbox.Publisher{DB: e.db, Producer: snd, Interval: time.Hour}
	e.enqueue(t, "a")

	done := make(chan error, 1)
	go func() { _, err := pub.Flush(context.Background()); done <- err }()
	<-snd.entered

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	waited := make(chan error, 1)
	go func() { _, err := pub.Flush(ctx); waited <- err }()
	select {
	case err := <-waited:
		if !errors.Is(err, context.DeadlineExceeded) {
			t.Fatalf("waiter error: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("a waiting flush ignored its context while another send was stuck")
	}
	close(snd.stall)
	if err := <-done; err != nil {
		t.Fatalf("stalled flush: %v", err)
	}
	if got := e.unsent(t); got != 0 {
		t.Fatalf("%d rows unsent", got)
	}
}
