// Package outbox publishes rows written by business transactions (§6.6).
// Every instance publishes; SKIP LOCKED keeps them off each other's rows, and
// a row is marked published only after Kafka acknowledged it. A flush ends by
// settling the services that consume what it sent (§16 I-16).
package outbox

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	kgo "github.com/segmentio/kafka-go"

	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

const batchSize = 100

type Publisher struct {
	DB       *repository.DB
	Producer *kafka.Producer
	Interval time.Duration
	// Wake is called once per flush with the events it published, and
	// returns once the services that consume them have answered.
	Wake    func(ctx context.Context, sent map[string]int)
	healthy bool
	// batch publishes one batch; tests replace it.
	batch func(ctx context.Context) (map[string]int, int, error)
}

func (p *Publisher) Healthy() bool { return p.healthy }

// Run flushes every Interval until ctx ends: where CPU is always allocated.
// On request-based CPU nothing runs it; requests and settles call Flush.
func (p *Publisher) Run(ctx context.Context) {
	ticker := time.NewTicker(p.Interval)
	defer ticker.Stop()
	for {
		if _, err := p.Flush(ctx); err != nil && ctx.Err() == nil {
			slog.Warn("outbox publish failed; will retry", "error", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// Flush publishes batches until the outbox is empty, then settles the
// consumers of what it sent. Kafka being down leaves rows queued (§9.2).
func (p *Publisher) Flush(ctx context.Context) (int, error) {
	batch := p.batch
	if batch == nil {
		batch = p.publishBatch
	}
	sent := map[string]int{}
	total := 0
	var err error
	for {
		var got map[string]int
		var n int
		got, n, err = batch(ctx)
		for event, count := range got {
			sent[event] += count
		}
		total += n
		if err != nil || n < batchSize {
			break
		}
	}
	p.healthy = err == nil
	if len(sent) > 0 && p.Wake != nil {
		p.Wake(ctx, sent)
	}
	return total, err
}

func (p *Publisher) publishBatch(ctx context.Context) (map[string]int, int, error) {
	var n int
	perEvent := map[string]int{}
	err := p.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		rows, err := repository.ClaimOutbox(ctx, tx, batchSize)
		if err != nil || len(rows) == 0 {
			return err
		}
		msgs := make([]kgo.Message, 0, len(rows))
		ids := make([]int64, 0, len(rows))
		for _, row := range rows {
			msg, err := p.Producer.Message(ctx, kafka.Outgoing{Event: row.Event, Key: row.Key, RequestID: row.RequestID,
				ClaimKey: ClaimKey(row), Data: row.Payload})
			if errors.Is(err, kafka.ErrContract) {
				// A row that fails its schema can never be sent; park it
				// as published so it doesn't block the queue, and say so.
				slog.Error("outbox row violates the contract; skipped", "id", row.ID, "event", row.Event, "error", err)
				ids = append(ids, row.ID)
				continue
			} else if err != nil {
				// Storage for the claim-check is unavailable: retry the batch.
				return err
			}
			msgs = append(msgs, msg)
			ids = append(ids, row.ID)
		}
		if err := p.Producer.Write(ctx, msgs...); err != nil {
			return err
		}
		n = len(rows)
		if err := repository.MarkPublished(ctx, tx, ids); err != nil {
			return err
		}
		for _, row := range rows {
			perEvent[row.Event]++
		}
		for event, count := range perEvent {
			slog.Info("published to Kafka", "step", "outbox", "event", event, "topic", kafka.TopicFor[event], "messages", count)
		}
		return nil
	})
	if err != nil {
		return nil, 0, err
	}
	return perEvent, n, nil
}

// ClaimKey names a row's claim-check object, so every publish attempt of
// the row reuses one object; created_at keeps it unique if ids restart.
func ClaimKey(row repository.OutboxRow) string {
	return fmt.Sprintf("outbox-%d-%d", row.ID, row.CreatedAt.UnixMicro())
}
