// Package outbox publishes rows written by business transactions (§6.6).
// Every instance runs a publisher; SKIP LOCKED keeps them off each other's
// rows, and a row is marked published only after Kafka acknowledged it.
package outbox

import (
	"context"
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
	healthy  bool
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
			msg, err := p.Producer.Message(ctx, row.Topic, row.Key, row.Payload)
			if err != nil {
				// A row that fails its schema can never be sent; park it
				// as published so it doesn't block the queue, and say so.
				slog.Error("outbox row violates the contract; skipped", "id", row.ID, "topic", row.Topic, "error", err)
				ids = append(ids, row.ID)
				continue
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
		perTopic := map[string]int{}
		for _, m := range msgs {
			perTopic[m.Topic]++
		}
		for topic, count := range perTopic {
			slog.Info("published to Kafka", "step", "outbox", "topic", topic, "messages", count)
		}
		return nil
	})
	return n, err
}
