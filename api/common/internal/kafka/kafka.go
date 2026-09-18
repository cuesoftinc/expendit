// Package kafka wires api/common into the same Aiven Kafka pub/sub the
// intake -> process -> common receipt pipeline uses — chosen over gRPC s2s
// because a queue retains messages across a consumer restart, where a gRPC
// channel can silently zombie on Cloud Run scale-to-zero.
package kafka

import (
	"crypto/tls"
	"os"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/sasl/scram"
)

const (
	TopicReceiptUploaded  = "expendit.receipts.uploaded"  // consumed: produced by api/intake
	TopicReceiptReady     = "expendit.receipts.ready"     // produced: consumed by api/process
	TopicReceiptProcessed = "expendit.receipts.processed" // consumed: produced by api/process
)

func brokers() []string {
	raw := os.Getenv("KAFKA_BROKERS")
	if raw == "" {
		return nil
	}
	return strings.Split(raw, ",")
}

func dialer() (*kafka.Dialer, error) {
	dialer := &kafka.Dialer{Timeout: 10 * time.Second, DualStack: true}
	username := os.Getenv("KAFKA_USERNAME")
	if username == "" {
		return dialer, nil
	}
	mechanism, err := scram.Mechanism(scram.SHA256, username, os.Getenv("KAFKA_PASSWORD"))
	if err != nil {
		return nil, err
	}
	dialer.SASLMechanism = mechanism
	dialer.TLS = &tls.Config{MinVersion: tls.VersionTLS12}
	return dialer, nil
}

// NewReader returns nil (disabled) when KAFKA_BROKERS is unset, matching
// api/intake and api/process's same "disabled without config" posture.
func NewReader(topic, groupID string) (*kafka.Reader, error) {
	b := brokers()
	if len(b) == 0 {
		return nil, nil
	}
	d, err := dialer()
	if err != nil {
		return nil, err
	}
	return kafka.NewReader(kafka.ReaderConfig{
		Brokers: b,
		Topic:   topic,
		GroupID: groupID,
		Dialer:  d,
	}), nil
}

func NewWriter(topic string) (*kafka.Writer, error) {
	b := brokers()
	if len(b) == 0 {
		return nil, nil
	}
	d, err := dialer()
	if err != nil {
		return nil, err
	}
	return &kafka.Writer{
		Addr:     kafka.TCP(b...),
		Topic:    topic,
		Balancer: &kafka.LeastBytes{},
		Transport: &kafka.Transport{
			SASL: d.SASLMechanism,
			TLS:  d.TLS,
		},
	}, nil
}
