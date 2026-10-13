package kafka

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/cuesoftinc/expendit/api/common/internal/config"
)

type memBlobs map[string][]byte

func (m memBlobs) Bucket() string { return "b" }
func (m memBlobs) Prefix() string { return "expendit/test" }
func (m memBlobs) Put(_ context.Context, key string, data []byte, _ string) error {
	m[key] = data
	return nil
}
func (m memBlobs) Get(_ context.Context, key string) ([]byte, error) { return m[key], nil }

func TestSharedBus(t *testing.T) {
	contract, err := LoadContract()
	if err != nil {
		t.Fatal(err)
	}
	blobs := memBlobs{}
	producer, err := NewProducer(config.Kafka{Brokers: []string{"unused:9092"}}, contract, blobs)
	if err != nil {
		t.Fatal(err)
	}
	consumer, err := NewConsumer(config.Kafka{Brokers: []string{"unused:9092"}}, "expendit-common", TopicResults,
		map[string]Handler{EventComputeResults: nil}, contract, blobs)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()

	// Our payload goes by pointer: the lane carries no user data.
	data := json.RawMessage(`{"request_id":"7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f","org_id":"3f6e2b1a-9c8d-4e7f-a6b5-c4d3e2f1a0b9","kind":"ratios","data_version":1,"status":"ok","ratios":[]}`)
	msg, err := producer.Message(ctx, EventComputeResults, "k", data)
	if err != nil {
		t.Fatal(err)
	}
	if msg.Topic != TopicResults || strings.Contains(string(msg.Value), "ratios") || !strings.Contains(string(msg.Value), "data_ref") {
		t.Fatalf("expected a pointer on %s, got %s on %s", TopicResults, msg.Value, msg.Topic)
	}
	event, got, err := consumer.unwrap(ctx, msg.Value)
	if err != nil || event != EventComputeResults || string(got) != string(data) {
		t.Fatalf("own event: %s %s %v", event, got, err)
	}

	// The heartbeat holds no user data and stays inline.
	hb, err := producer.Message(ctx, EventHeartbeat, "heartbeat", json.RawMessage(`{"sent_at":"2026-10-13T06:00:00Z","source":"reaper"}`))
	if err != nil || !strings.Contains(string(hb.Value), `"source":"reaper"`) {
		t.Fatalf("heartbeat: %s %v", hb.Value, err)
	}

	// Everything else on the lane is skipped without validation or error.
	for name, raw := range map[string]string{
		"another product":        `{"type":"apparule.capture.measured","version":7,"weird":true}`,
		"ours, another consumer": `{"type":"expendit.import.processed","version":1,"id":"x","produced_at":"x"}`,
		"not JSON":               `\x00\x01protobuf`,
	} {
		if _, _, err := consumer.unwrap(ctx, []byte(raw)); !errors.Is(err, errNotOurs) {
			t.Errorf("%s: want errNotOurs, got %v", name, err)
		}
	}
}
