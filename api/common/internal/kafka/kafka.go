// Package kafka is the transport: topic and event names, the envelope with
// its claim-check (S-3), a producer for the outbox, and consumers that commit
// after their handler succeeds or, after bounded retries, after recording
// the failure (at-least-once, §9.2; never block a shared partition).
package kafka

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	kgo "github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/sasl/scram"

	"github.com/cuesoftinc/expendit/api/common/internal/config"
)

// Events (S-13): the envelope's type, and the schema its data must match
// (api/common/contract/<event>.schema.json).
const (
	EventUploadReceived   = "expendit.upload.received"
	EventImportReady      = "expendit.import.ready"
	EventStatementReady   = "expendit.statement.ready"
	EventImportProcessed  = "expendit.import.processed"
	EventStatementMapped  = "expendit.statement.mapped"
	EventComputeRequested = "expendit.compute.requested"
	EventComputeResults   = "expendit.compute.results"
	// EventHeartbeat keeps the shared managed Kafka from powering off when idle
	// (§16 I-17). Consumers drop it.
	EventHeartbeat = "expendit.system.heartbeat"
)

// Topics are the lanes of the shared message bus, which every product reads
// and writes (system-design.md §16 I-18). The event type says whose message
// it is.
const (
	TopicUploads  = "cuelabs.uploads"  // upload gateways -> control planes
	TopicRequests = "cuelabs.requests" // control planes -> processing
	TopicResults  = "cuelabs.results"  // processing -> control planes
)

// Product prefixes every event type this service may handle.
const Product = "expendit."

// TopicFor names the lane an event travels on.
var TopicFor = map[string]string{
	EventUploadReceived:   TopicUploads,
	EventImportReady:      TopicRequests,
	EventStatementReady:   TopicRequests,
	EventComputeRequested: TopicRequests,
	EventHeartbeat:        TopicRequests,
	EventImportProcessed:  TopicResults,
	EventStatementMapped:  TopicResults,
	EventComputeResults:   TopicResults,
}

// inline lists the events whose data may ride in the message: only ids,
// enums and timestamps. Everything else goes by data_ref, because every
// product on the bus can read every lane.
var inline = map[string]bool{EventHeartbeat: true}

// Envelope versions are "<major>.<minor>"; a consumer rejects another major.
const (
	envelopeVersion = "1.0"
	envelopeMajor   = "1"
)

type Envelope struct {
	Type       string          `json:"type"`
	Version    string          `json:"version"`
	ID         string          `json:"id"`
	ProducedAt string          `json:"produced_at"`
	RequestID  string          `json:"request_id,omitempty"`
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

// Blobs is the slice of object storage the claim-check needs. Get wraps
// fs.ErrNotExist when the object is missing.
type Blobs interface {
	Bucket() string
	Prefix() string
	Put(ctx context.Context, key string, data []byte, contentType string) error
	Get(ctx context.Context, key string) ([]byte, error)
	Exists(ctx context.Context, key string) (bool, error)
}

func dialer(cfg config.Kafka) (*kgo.Dialer, *kgo.Transport, error) {
	d := &kgo.Dialer{Timeout: 10 * time.Second, DualStack: true}
	t := &kgo.Transport{}
	if cfg.Username == "" {
		return d, t, nil
	}
	// SASL/SCRAM over TLS, one user per service (S-11).
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

// Outgoing is one message to build. ClaimKey names its claim-check object:
// set, the object is written once and reused by later publish attempts;
// empty, the message id names it.
type Outgoing struct {
	Event     string
	Key       string
	RequestID string
	ClaimKey  string
	Data      json.RawMessage
}

// Message builds a validated envelope for an event, addressed to its lane.
// The data goes to compute/ in storage and the message carries the pointer
// (S-3 claim-check), except for the few events that hold no user data.
func (p *Producer) Message(ctx context.Context, out Outgoing) (kgo.Message, error) {
	topic, ok := TopicFor[out.Event]
	if !ok {
		return kgo.Message{}, fmt.Errorf("%w: no topic for event %s", ErrContract, out.Event)
	}
	if err := p.contract.Validate(out.Event, out.Data); err != nil {
		return kgo.Message{}, fmt.Errorf("%w: %s: %v", ErrContract, out.Event, err)
	}
	env := Envelope{Type: out.Event, Version: envelopeVersion, ID: uuid.NewString(),
		ProducedAt: time.Now().UTC().Format(time.RFC3339Nano), RequestID: out.RequestID}
	if !inline[out.Event] {
		name := out.ClaimKey
		if name == "" {
			name = env.ID
		}
		objKey := fmt.Sprintf("%s/compute/%s.json", p.blobs.Prefix(), name)
		written := false
		if out.ClaimKey != "" {
			var err error
			if written, err = p.blobs.Exists(ctx, objKey); err != nil {
				return kgo.Message{}, err
			}
		}
		if !written {
			if err := p.blobs.Put(ctx, objKey, out.Data, "application/json"); err != nil {
				return kgo.Message{}, err
			}
		}
		env.DataRef = &ObjectRef{Bucket: p.blobs.Bucket(), Key: objKey, Size: int64(len(out.Data)), ContentType: "application/json"}
	} else {
		env.Data = out.Data
	}
	raw, err := json.Marshal(env)
	if err != nil {
		return kgo.Message{}, err
	}
	if err := p.contract.Validate("envelope", raw); err != nil {
		return kgo.Message{}, fmt.Errorf("%w: envelope: %v", ErrContract, err)
	}
	return kgo.Message{Topic: topic, Key: []byte(out.Key), Value: raw}, nil
}

func (p *Producer) Write(ctx context.Context, msgs ...kgo.Message) error {
	return p.writer.WriteMessages(ctx, msgs...)
}

// Heartbeat sends one EventHeartbeat straight to Kafka (not through the
// outbox, so no service is woken for it).
func (p *Producer) Heartbeat(ctx context.Context, source string) error {
	data, err := json.Marshal(map[string]string{"sent_at": time.Now().UTC().Format(time.RFC3339), "source": source})
	if err != nil {
		return err
	}
	msg, err := p.Message(ctx, Outgoing{Event: EventHeartbeat, Key: "heartbeat", Data: data})
	if err != nil {
		return err
	}
	return p.Write(ctx, msg)
}

// Handler processes one validated payload. An error is retried with
// backoff; one that persists is recorded as failed and the message is
// committed, so no message blocks a shared partition.
type Handler func(ctx context.Context, data json.RawMessage) error

// Failer records, against the event's status row, a message whose handler
// kept failing.
type Failer func(ctx context.Context, data json.RawMessage) error

// defaultBackoff gives each message three attempts.
var defaultBackoff = []time.Duration{time.Second, 4 * time.Second}

type messageReader interface {
	FetchMessage(ctx context.Context) (kgo.Message, error)
	CommitMessages(ctx context.Context, msgs ...kgo.Message) error
	Close() error
}

// Consumer reads one topic and routes each message to the handler for its
// event type.
type Consumer struct {
	reader   messageReader
	topic    string
	handlers map[string]Handler
	// Failures maps an event to the Failer that records it; optional.
	Failures map[string]Failer
	contract *Contract
	blobs    Blobs
	backoff  []time.Duration
	running  bool
}

func NewConsumer(cfg config.Kafka, group, topic string, handlers map[string]Handler, contract *Contract, blobs Blobs) (*Consumer, error) {
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
		topic: topic, handlers: handlers, contract: contract, blobs: blobs, backoff: defaultBackoff,
	}, nil
}

func (c *Consumer) Running() bool { return c.running }

// Run blocks until ctx ends or Kafka fails. A message that ctx interrupts
// is left uncommitted and redelivered.
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
		if !c.process(ctx, msg) {
			return nil
		}
		if err := c.reader.CommitMessages(ctx, msg); err != nil && ctx.Err() == nil {
			return err
		}
	}
}

// process handles one message and reports whether to commit it: false only
// when ctx ended first.
func (c *Consumer) process(ctx context.Context, msg kgo.Message) bool {
	env, err := c.open(msg.Value)
	if errors.Is(err, errNotOurs) {
		// Another product's event, or one another pool handles.
		return true
	}
	if err != nil {
		// Can never succeed; skip rather than block the partition.
		// Never log the payload (never-log list).
		slog.Error("dropping invalid message", "topic", c.topic, "offset", msg.Offset, "request_id", requestIDOf(env), "error", err)
		return true
	}
	log := slog.With("topic", c.topic, "event", env.Type, "offset", msg.Offset, "request_id", env.RequestID)
	var data json.RawMessage
	var lastErr error
	for attempt := 0; attempt <= len(c.backoff); attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return false
			case <-time.After(c.backoff[attempt-1]):
			}
		}
		if data == nil {
			if data, err = c.resolve(ctx, env); err != nil && permanent(err) {
				log.Error("dropping message: payload missing or invalid", "error", err)
				return true
			}
		}
		if data != nil {
			if err = c.handlers[env.Type](ctx, data); err == nil {
				return true
			}
		}
		if ctx.Err() != nil {
			return false
		}
		lastErr = err
		log.Warn("message failed; will retry", "attempt", attempt+1, "error", err)
	}
	log.Error("message kept failing; recorded as failed and committed", "attempts", len(c.backoff)+1, "error", lastErr)
	if fail := c.Failures[env.Type]; fail != nil && data != nil {
		if err := fail(ctx, data); err != nil {
			log.Error("could not record the failure", "error", err)
		}
	}
	return true
}

func requestIDOf(env *Envelope) string {
	if env == nil {
		return ""
	}
	return env.RequestID
}

// ErrContract marks a message that can never be sent or handled as it is
// (it fails its schema). Any other error from Message (storage, say) is
// worth retrying.
var ErrContract = errors.New("violates the contract")

// errNotOurs marks a message this consumer skips without a word: the lanes
// are shared, so most messages on them belong to someone else.
var errNotOurs = errors.New("not handled here")

// permanent errors are never retried: the contract, or a missing object.
func permanent(err error) bool {
	return errors.Is(err, ErrContract) || errors.Is(err, fs.ErrNotExist)
}

// open reads and checks the envelope of one of this consumer's events.
func (c *Consumer) open(raw []byte) (*Envelope, error) {
	// Read the type first: other products' envelopes are not ours to validate.
	var head struct {
		Type string `json:"type"`
	}
	if json.Unmarshal(raw, &head) != nil || !strings.HasPrefix(head.Type, Product) {
		return nil, errNotOurs
	}
	if _, ok := c.handlers[head.Type]; !ok || TopicFor[head.Type] != c.topic {
		return nil, errNotOurs
	}
	var env Envelope
	if err := c.contract.Validate("envelope", raw); err != nil {
		_ = json.Unmarshal(raw, &env)
		return &env, fmt.Errorf("%w: envelope: %v", ErrContract, err)
	}
	if err := json.Unmarshal(raw, &env); err != nil {
		return nil, fmt.Errorf("%w: envelope: %v", ErrContract, err)
	}
	if major, _, _ := strings.Cut(env.Version, "."); major != envelopeMajor {
		return &env, fmt.Errorf("%w: unsupported envelope version %s", ErrContract, env.Version)
	}
	return &env, c.checkPayload(&env)
}

// checkPayload allows inline data only for the events that hold no user
// data, and pointers only into Expendit's own compute/ and tmp/ prefixes.
func (c *Consumer) checkPayload(env *Envelope) error {
	if env.Data != nil && !inline[env.Type] {
		return fmt.Errorf("%w: %s must go by data_ref", ErrContract, env.Type)
	}
	if ref := env.DataRef; ref != nil {
		prefix := c.blobs.Prefix()
		owned := strings.HasPrefix(ref.Key, prefix+"/compute/") || strings.HasPrefix(ref.Key, prefix+"/tmp/")
		if ref.Bucket != c.blobs.Bucket() || !owned || strings.Contains(ref.Key, "..") {
			return fmt.Errorf("%w: data_ref outside Expendit's storage", ErrContract)
		}
	}
	return nil
}

// resolve fetches a data_ref and validates the payload against its event.
func (c *Consumer) resolve(ctx context.Context, env *Envelope) (json.RawMessage, error) {
	data := env.Data
	if env.DataRef != nil {
		var err error
		if data, err = c.blobs.Get(ctx, env.DataRef.Key); err != nil {
			return nil, err
		}
	}
	if err := c.contract.Validate(env.Type, data); err != nil {
		return nil, fmt.Errorf("%w: %s: %v", ErrContract, env.Type, err)
	}
	return data, nil
}
