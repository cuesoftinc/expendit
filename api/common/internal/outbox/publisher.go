// Package outbox publishes rows written by business transactions (§6.6).
// Every instance runs a publisher; SKIP LOCKED keeps them off each other's
// rows, and a row is marked published only after Kafka acknowledged it.
// After a batch it wakes the services that consume what it sent (§16 I-16).
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
	// Wake is called with each event a batch published.
	Wake    func(event string)
	healthy bool
}

func (p *Publisher) Healthy() bool { return p.healthy }

// Run publishes until ctx ends. Kafka being down leaves rows queued (§9.2).
func (p *Publisher) Run(ctx context.Context) {
	ticker := time.NewTicker(p.Interval)
	defer ticker.Stop()
	for {
		for {
			n, err := p.publishBatch(ctx)
			p.healthy = err == nil
			if err != nil && ctx.Err() == nil {
				slog.Warn("outbox publish failed; will retry", "error", err)
			}
			if err != nil || n < batchSize {
				break
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (p *Publisher) publishBatch(ctx context.Context) (int, error) {
	var n int
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
		perEvent := map[string]int{}
		for _, row := range rows {
			perEvent[row.Event]++
		}
		for event, count := range perEvent {
			slog.Info("published to Kafka", "step", "outbox", "event", event, "topic", kafka.TopicFor[event], "messages", count)
			if p.Wake != nil {
				p.Wake(event)
			}
		}
		return nil
	})
	return n, err
}

// ClaimKey names a row's claim-check object, so every publish attempt of
// the row reuses one object; created_at keeps it unique if ids restart.
func ClaimKey(row repository.OutboxRow) string {
	return fmt.Sprintf("outbox-%d-%d", row.ID, row.CreatedAt.UnixMicro())
}
