package kafka

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"strings"
	"testing"
	"time"

	kgo "github.com/segmentio/kafka-go"

	"github.com/cuesoftinc/expendit/api/common/internal/config"
)

type memBlobs struct {
	objects map[string][]byte
	puts    int
	// getErrs are returned, one per Get, before the object is.
	getErrs []error
}

func newBlobs() *memBlobs { return &memBlobs{objects: map[string][]byte{}} }

func (m *memBlobs) Bucket() string { return "b" }
func (m *memBlobs) Prefix() string { return "expendit/test" }
func (m *memBlobs) Put(_ context.Context, key string, data []byte, _ string) error {
	m.puts++
	m.objects[key] = data
	return nil
}
func (m *memBlobs) Get(_ context.Context, key string) ([]byte, error) {
	if len(m.getErrs) > 0 {
		err := m.getErrs[0]
		m.getErrs = m.getErrs[1:]
		return nil, err
	}
	data, ok := m.objects[key]
	if !ok {
		return nil, fmt.Errorf("%w: %s", fs.ErrNotExist, key)
	}
	return data, nil
}
func (m *memBlobs) Exists(_ context.Context, key string) (bool, error) {
	_, ok := m.objects[key]
	return ok, nil
}

const resultData = `{"request_id":"7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f","org_id":"3f6e2b1a-9c8d-4e7f-a6b5-c4d3e2f1a0b9","kind":"ratios","data_version":1,"status":"ok","ratios":[]}`

func setupBus(t *testing.T) (*Contract, *memBlobs, *Producer) {
	t.Helper()
	contract, err := LoadContract()
	if err != nil {
		t.Fatal(err)
	}
	blobs := newBlobs()
	producer, err := NewProducer(config.Kafka{Brokers: []string{"unused:9092"}}, contract, blobs)
	if err != nil {
		t.Fatal(err)
	}
	return contract, blobs, producer
}

func TestSharedBus(t *testing.T) {
	contract, blobs, producer := setupBus(t)
	consumer := &Consumer{topic: TopicResults, handlers: map[string]Handler{EventComputeResults: nil}, contract: contract, blobs: blobs}
	ctx := context.Background()

	// Our payload goes by pointer: the lane carries no user data.
	data := json.RawMessage(resultData)
	msg, err := producer.Message(ctx, Outgoing{Event: EventComputeResults, Key: "k", RequestID: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f", Data: data})
	if err != nil {
		t.Fatal(err)
	}
	if msg.Topic != TopicResults || strings.Contains(string(msg.Value), "ratios") || !strings.Contains(string(msg.Value), "data_ref") {
		t.Fatalf("expected a pointer on %s, got %s on %s", TopicResults, msg.Value, msg.Topic)
	}
	var env Envelope
	if err := json.Unmarshal(msg.Value, &env); err != nil || env.Version != "1.0" || env.RequestID != "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f" {
		t.Fatalf("envelope version and request_id: %+v %v", env, err)
	}
	opened, err := consumer.open(msg.Value)
	if err != nil {
		t.Fatal(err)
	}
	got, err := consumer.resolve(ctx, opened)
	if err != nil || opened.Type != EventComputeResults || string(got) != string(data) {
		t.Fatalf("own event: %s %s %v", opened.Type, got, err)
	}

	// The heartbeat holds no user data and stays inline.
	hb, err := producer.Message(ctx, Outgoing{Event: EventHeartbeat, Key: "heartbeat", Data: json.RawMessage(`{"sent_at":"2026-10-13T06:00:00Z","source":"reaper"}`)})
	if err != nil || !strings.Contains(string(hb.Value), `"source":"reaper"`) {
		t.Fatalf("heartbeat: %s %v", hb.Value, err)
	}

	// Everything else on the lane is skipped without validation or error.
	for name, raw := range map[string]string{
		"another product":        `{"type":"apparule.capture.measured","version":7,"weird":true}`,
		"ours, another consumer": `{"type":"expendit.import.processed","version":"1.0","id":"x","produced_at":"x"}`,
		"not JSON":               `\x00\x01protobuf`,
	} {
		if _, err := consumer.open([]byte(raw)); !errors.Is(err, errNotOurs) {
			t.Errorf("%s: want errNotOurs, got %v", name, err)
		}
	}
}

func TestClaimCheckIsWrittenOncePerClaimKey(t *testing.T) {
	_, blobs, producer := setupBus(t)
	ctx := context.Background()
	out := Outgoing{Event: EventComputeResults, Key: "k", ClaimKey: "outbox-7-1", Data: json.RawMessage(resultData)}
	first, err := producer.Message(ctx, out)
	if err != nil {
		t.Fatal(err)
	}
	second, err := producer.Message(ctx, out)
	if err != nil {
		t.Fatal(err)
	}
	var a, b Envelope
	_ = json.Unmarshal(first.Value, &a)
	_ = json.Unmarshal(second.Value, &b)
	if blobs.puts != 1 || a.DataRef.Key != b.DataRef.Key || a.DataRef.Key != "expendit/test/compute/outbox-7-1.json" || a.ID == b.ID {
		t.Fatalf("puts=%d keys %s %s ids %s %s", blobs.puts, a.DataRef.Key, b.DataRef.Key, a.ID, b.ID)
	}
}

func TestConsumerRejectsOffContractEnvelopes(t *testing.T) {
	contract, blobs, _ := setupBus(t)
	consumer := &Consumer{topic: TopicResults, handlers: map[string]Handler{EventComputeResults: nil}, contract: contract, blobs: blobs}
	blobs.objects["expendit/test/compute/x.json"] = []byte(resultData)
	head := `"type":"expendit.compute.results","id":"0b8f3c2e-6a1d-4c5e-9f7a-1d2e3f4a5b6c","produced_at":"2026-10-05T10:00:03Z"`
	for name, raw := range map[string]string{
		"integer version":      `{` + head + `,"version":1,"data_ref":{"bucket":"b","key":"expendit/test/compute/x.json"}}`,
		"unsupported major":    `{` + head + `,"version":"2.0","data_ref":{"bucket":"b","key":"expendit/test/compute/x.json"}}`,
		"inline data":          `{` + head + `,"version":"1.0","data":` + resultData + `}`,
		"another bucket":       `{` + head + `,"version":"1.0","data_ref":{"bucket":"other","key":"expendit/test/compute/x.json"}}`,
		"another prefix":       `{` + head + `,"version":"1.0","data_ref":{"bucket":"b","key":"apparule/test/compute/x.json"}}`,
		"outside compute, tmp": `{` + head + `,"version":"1.0","data_ref":{"bucket":"b","key":"expendit/test/reports/x.json"}}`,
		"escapes the prefix":   `{` + head + `,"version":"1.0","data_ref":{"bucket":"b","key":"expendit/test/tmp/../../other/x.json"}}`,
	} {
		if _, err := consumer.open([]byte(raw)); !errors.Is(err, ErrContract) {
			t.Errorf("%s: want a contract error, got %v", name, err)
		}
	}
	ok := `{` + head + `,"version":"1.1","request_id":"r1","data_ref":{"bucket":"b","key":"expendit/test/compute/x.json"}}`
	if env, err := consumer.open([]byte(ok)); err != nil || env.RequestID != "r1" {
		t.Fatalf("a newer minor is accepted: %v", err)
	}
}

type fakeReader struct {
	msgs      []kgo.Message
	committed []int64
	done      context.CancelFunc
}

func (f *fakeReader) FetchMessage(ctx context.Context) (kgo.Message, error) {
	if len(f.msgs) == 0 {
		f.done()
		<-ctx.Done()
		return kgo.Message{}, ctx.Err()
	}
	m := f.msgs[0]
	f.msgs = f.msgs[1:]
	return m, nil
}

func (f *fakeReader) CommitMessages(_ context.Context, msgs ...kgo.Message) error {
	for _, m := range msgs {
		f.committed = append(f.committed, m.Offset)
	}
	return nil
}

func (f *fakeReader) Close() error { return nil }

func envelopeAt(t *testing.T, producer *Producer, offset int64) kgo.Message {
	t.Helper()
	msg, err := producer.Message(context.Background(), Outgoing{Event: EventComputeResults, Key: "k", RequestID: "r", Data: json.RawMessage(resultData)})
	if err != nil {
		t.Fatal(err)
	}
	msg.Offset = offset
	return msg
}

func TestConsumerNeverBlocksThePartition(t *testing.T) {
	contract, blobs, producer := setupBus(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Offset 1 fails every attempt; offset 2 succeeds after a transient
	// storage error; offset 3's payload is gone.
	gone := envelopeAt(t, producer, 3)
	var env Envelope
	_ = json.Unmarshal(gone.Value, &env)
	delete(blobs.objects, env.DataRef.Key)
	reader := &fakeReader{msgs: []kgo.Message{envelopeAt(t, producer, 1), envelopeAt(t, producer, 2), gone}, done: cancel}

	call := 0
	var failed []string
	consumer := &Consumer{
		reader: reader, topic: TopicResults, contract: contract, blobs: blobs, backoff: []time.Duration{0, 0},
		handlers: map[string]Handler{EventComputeResults: func(context.Context, json.RawMessage) error {
			call++
			if call <= 3 {
				return errors.New("database down")
			}
			return nil
		}},
		Failures: map[string]Failer{EventComputeResults: func(_ context.Context, data json.RawMessage) error {
			failed = append(failed, string(data))
			if len(failed) == 1 {
				blobs.getErrs = []error{errors.New("storage timeout")}
			}
			return nil
		}},
	}
	if err := consumer.Run(ctx); err != nil {
		t.Fatal(err)
	}
	if call != 4 {
		t.Fatalf("handler calls = %d, want 3 for the failing message and 1 for the next", call)
	}
	if len(failed) != 1 || failed[0] != resultData {
		t.Fatalf("the failing message must be recorded once: %v", failed)
	}
	if fmt.Sprint(reader.committed) != "[1 2 3]" {
		t.Fatalf("every message is committed and the consumer keeps going: %v", reader.committed)
	}
}

func TestConsumerStopsCleanlyMidRetry(t *testing.T) {
	contract, blobs, producer := setupBus(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	reader := &fakeReader{msgs: []kgo.Message{envelopeAt(t, producer, 1)}, done: cancel}
	consumer := &Consumer{
		reader: reader, topic: TopicResults, contract: contract, blobs: blobs, backoff: []time.Duration{time.Hour},
		handlers: map[string]Handler{EventComputeResults: func(context.Context, json.RawMessage) error {
			cancel()
			return errors.New("interrupted")
		}},
	}
	if err := consumer.Run(ctx); err != nil {
		t.Fatal(err)
	}
	if len(reader.committed) != 0 {
		t.Fatalf("an interrupted message must not be committed: %v", reader.committed)
	}
}
