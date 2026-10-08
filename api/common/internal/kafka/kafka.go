// Package kafka is the transport: topic names, the envelope with its 512 KB
// claim-check (S-3), a producer for the outbox, and consumers that commit
// only after their handler succeeds (at-least-once, §9.2).
package kafka

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	kgo "github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/sasl/scram"

	"github.com/cuesoftinc/expendit/api/common/internal/config"
)

// Topics (S-13). Schemas: api/common/contract.
const (
	TopicConfigRulesets   = "expendit.config.rulesets"
	TopicUploadReceived   = "expendit.upload.received"
	TopicImportReady      = "expendit.import.ready"
	TopicImportProcessed  = "expendit.import.processed"
	TopicStatementReady   = "expendit.statement.ready"
	TopicStatementMapped  = "expendit.statement.mapped"
	TopicComputeRequested = "expendit.compute.requested"
	TopicComputeResults   = "expendit.compute.results"
)

const (
	envelopeVersion = 1
	InlineLimit     = 512 * 1024
)

type Envelope struct {
	Type       string          `json:"type"`
	Version    int             `json:"version"`
	ID         string          `json:"id"`
	ProducedAt string          `json:"produced_at"`
	Data       json.RawMessage `json:"data,omitempty"`
	DataRef    *ObjectRef      `json:"data_ref,omitempty"`
}

type ObjectRef struct {
	Bucket      string `json:"bucket"`
	Key         string `json:"key"`
	Size        int64  `json:"size,omitempty"`
	ContentType string `json:"content_type,omitempty"`
	SHA256      string `json:"sha256,omitempty"`
}

// Blobs is the slice of object storage the claim-check needs.
type Blobs interface {
	Bucket() string
	Prefix() string
	Put(ctx context.Context, key string, data []byte, contentType string) error
	Get(ctx context.Context, key string) ([]byte, error)
}

func dialer(cfg config.Kafka) (*kgo.Dialer, *kgo.Transport, error) {
	d := &kgo.Dialer{Timeout: 10 * time.Second, DualStack: true}
	t := &kgo.Transport{}
	if cfg.Username == "" {
		return d, t, nil
	}
	// Aiven: SASL/SCRAM over TLS, one user per service (S-11).
	mechanism, err := scram.Mechanism(scram.SHA256, cfg.Username, cfg.Password)
	if err != nil {
		return nil, nil, err
	}
	tlsCfg := &tls.Config{MinVersion: tls.VersionTLS12}
	if cfg.SSLCA != "" {
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM([]byte(cfg.SSLCA)) {
			return nil, nil, errors.New("KAFKA_SSL_CA is not a PEM certificate")
		}
		tlsCfg.RootCAs = pool
	}
	d.SASLMechanism, d.TLS = mechanism, tlsCfg
	t.SASL, t.TLS = mechanism, tlsCfg
	return d, t, nil
}

// Producer publishes envelopes; only the outbox publisher uses it.
type Producer struct {
	writer   *kgo.Writer
	contract *Contract
	blobs    Blobs
}

func NewProducer(cfg config.Kafka, contract *Contract, blobs Blobs) (*Producer, error) {
	_, transport, err := dialer(cfg)
	if err != nil {
		return nil, err
	}
	return &Producer{
		writer: &kgo.Writer{
			Addr:         kgo.TCP(cfg.Brokers...),
			Balancer:     &kgo.Hash{},
			RequiredAcks: kgo.RequireAll,
			Transport:    transport,
			BatchTimeout: 20 * time.Millisecond,
		},
		contract: contract,
		blobs:    blobs,
	}, nil
}

func (p *Producer) Close() error { return p.writer.Close() }

// Message builds a validated envelope for data, by reference when large.
func (p *Producer) Message(ctx context.Context, topic, key string, data json.RawMessage) (kgo.Message, error) {
	if err := p.contract.Validate(topic, data); err != nil {
		return kgo.Message{}, fmt.Errorf("%s: %w", topic, err)
	}
	env := Envelope{Type: topic, Version: envelopeVersion, ID: uuid.NewString(), ProducedAt: time.Now().UTC().Format(time.RFC3339Nano)}
	if len(data) > InlineLimit {
		objKey := fmt.Sprintf("%s/compute/%s.json", p.blobs.Prefix(), env.ID)
		if err := p.blobs.Put(ctx, objKey, data, "application/json"); err != nil {
			return kgo.Message{}, err
		}
		env.DataRef = &ObjectRef{Bucket: p.blobs.Bucket(), Key: objKey, Size: int64(len(data)), ContentType: "application/json"}
	} else {
		env.Data = data
	}
	raw, err := json.Marshal(env)
	if err != nil {
		return kgo.Message{}, err
	}
	if err := p.contract.Validate("envelope", raw); err != nil {
		return kgo.Message{}, err
	}
	return kgo.Message{Topic: topic, Key: []byte(key), Value: raw}, nil
}

func (p *Producer) Write(ctx context.Context, msgs ...kgo.Message) error {
	return p.writer.WriteMessages(ctx, msgs...)
}

// Handler processes one validated payload. Returning an error stops the
// consumer without committing, so the message is redelivered.
type Handler func(ctx context.Context, data json.RawMessage) error

type Consumer struct {
	reader   *kgo.Reader
	topic    string
	handler  Handler
	contract *Contract
	blobs    Blobs
	running  bool
}

func NewConsumer(cfg config.Kafka, group, topic string, handler Handler, contract *Contract, blobs Blobs) (*Consumer, error) {
	d, _, err := dialer(cfg)
	if err != nil {
		return nil, err
	}
	return &Consumer{
		reader: kgo.NewReader(kgo.ReaderConfig{
			Brokers:     cfg.Brokers,
			GroupID:     group,
			Topic:       topic,
			Dialer:      d,
			StartOffset: kgo.FirstOffset,
			MaxWait:     time.Second,
		}),
		topic: topic, handler: handler, contract: contract, blobs: blobs,
	}, nil
}

func (c *Consumer) Running() bool { return c.running }

// Run blocks until ctx ends or the handler fails.
func (c *Consumer) Run(ctx context.Context) error {
	c.running = true
	defer func() { c.running = false; _ = c.reader.Close() }()
	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		data, err := c.unwrap(ctx, msg.Value)
		if err != nil {
			// Can never succeed; skip rather than block the partition.
			// Never log the payload (never-log list).
			slog.Error("dropping invalid message", "topic", c.topic, "offset", msg.Offset, "error", err)
		} else if err := c.handler(ctx, data); err != nil {
			slog.Error("handler failed; stopping consumer", "topic", c.topic, "offset", msg.Offset, "error", err)
			return err
		}
		if err := c.reader.CommitMessages(ctx, msg); err != nil && ctx.Err() == nil {
			return err
		}
	}
}

func (c *Consumer) unwrap(ctx context.Context, raw []byte) (json.RawMessage, error) {
	if err := c.contract.Validate("envelope", raw); err != nil {
		return nil, err
	}
	var env Envelope
	if err := json.Unmarshal(raw, &env); err != nil {
		return nil, err
	}
	if env.Type != c.topic {
		return nil, fmt.Errorf("envelope type %s on topic %s", env.Type, c.topic)
	}
	data := env.Data
	if env.DataRef != nil {
		var err error
		if data, err = c.blobs.Get(ctx, env.DataRef.Key); err != nil {
			return nil, err
		}
	}
	return data, c.contract.Validate(c.topic, data)
}
