package outbox

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

func TestClaimKeyIsStablePerRow(t *testing.T) {
	at := time.Date(2026, 10, 27, 9, 0, 0, 123000, time.UTC)
	row := repository.OutboxRow{ID: 42, CreatedAt: at}
	if ClaimKey(row) != ClaimKey(row) || ClaimKey(row) != "outbox-42-1793091600000123" {
		t.Fatalf("claim key: %s", ClaimKey(row))
	}
	if ClaimKey(repository.OutboxRow{ID: 43, CreatedAt: at}) == ClaimKey(row) {
		t.Fatal("rows must not share a claim-check object")
	}
	if ClaimKey(repository.OutboxRow{ID: 42, CreatedAt: at.Add(time.Microsecond)}) == ClaimKey(row) {
		t.Fatal("a restarted id sequence must not reuse an old object")
	}
}

type batches struct {
	steps []step
	calls int
}

type step struct {
	sent map[string]int
	n    int
	err  error
}

func (b *batches) next(context.Context) (map[string]int, int, error) {
	b.calls++
	if len(b.steps) == 0 {
		return nil, 0, nil
	}
	s := b.steps[0]
	b.steps = b.steps[1:]
	return s.sent, s.n, s.err
}

func TestFlushPublishesEveryBatchThenWakesOnce(t *testing.T) {
	b := &batches{steps: []step{
		{map[string]int{"expendit.import.ready": batchSize}, batchSize, nil},
		{map[string]int{"expendit.import.ready": 7, "expendit.compute.requested": 3}, 10, nil},
	}}
	var woke []map[string]int
	p := &Publisher{batch: b.next, Wake: func(_ context.Context, sent map[string]int) { woke = append(woke, sent) }}
	total, err := p.Flush(context.Background())
	if err != nil || total != batchSize+10 {
		t.Fatalf("total = %d, err = %v", total, err)
	}
	if len(woke) != 1 || woke[0]["expendit.import.ready"] != batchSize+7 || woke[0]["expendit.compute.requested"] != 3 {
		t.Fatalf("wakes = %v; want one wake carrying every event sent", woke)
	}
}

func TestFlushWithNothingQueuedWakesNobody(t *testing.T) {
	woke := false
	p := &Publisher{batch: (&batches{}).next, Wake: func(context.Context, map[string]int) { woke = true }}
	if total, err := p.Flush(context.Background()); err != nil || total != 0 || woke {
		t.Fatalf("total = %d, err = %v, woke = %v", total, err, woke)
	}
}

func TestFlushStopsOnAFailureButStillSettlesWhatWasSent(t *testing.T) {
	b := &batches{steps: []step{
		{map[string]int{"expendit.import.ready": batchSize}, batchSize, nil},
		{nil, 0, errors.New("kafka away")},
		{map[string]int{"expendit.import.ready": 1}, 1, nil},
	}}
	var woke map[string]int
	p := &Publisher{batch: b.next, Wake: func(_ context.Context, sent map[string]int) { woke = sent }}
	if _, err := p.Flush(context.Background()); err == nil {
		t.Fatal("want the publish error returned")
	}
	if b.calls != 2 || woke["expendit.import.ready"] != batchSize {
		t.Fatalf("calls = %d, woke = %v; want no spin after the failure and a wake for the first batch", b.calls, woke)
	}
	if p.Healthy() {
		t.Fatal("a failed flush is unhealthy")
	}
}
