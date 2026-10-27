package kafka

import (
	"encoding/json"
	"io/fs"
	"strings"
	"testing"

	"github.com/cuesoftinc/expendit/api/common/contract"
)

func TestExamplesMatchSchemas(t *testing.T) {
	c, err := LoadContract()
	if err != nil {
		t.Fatal(err)
	}
	names, _ := fs.Glob(contract.Schemas, "examples/*.json")
	if len(names) < 5 {
		t.Fatalf("expected the contract examples, found %d", len(names))
	}
	for _, name := range names {
		raw, _ := contract.Schemas.ReadFile(name)
		if err := c.Validate("envelope", raw); err != nil {
			t.Errorf("%s envelope: %v", name, err)
		}
		var env Envelope
		if err := json.Unmarshal(raw, &env); err != nil {
			t.Fatal(err)
		}
		if err := c.Validate(env.Type, env.Data); err != nil {
			t.Errorf("%s data: %v", name, err)
		}
	}
}

func TestRejectsUnknownFieldsAndBadEnums(t *testing.T) {
	c, err := LoadContract()
	if err != nil {
		t.Fatal(err)
	}
	cases := map[string]string{
		"unknown field": `{"job_id":"7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f","org_id":"3f6e2b1a-9c8d-4e7f-a6b5-c4d3e2f1a0b9","status":"failed","extra":1}`,
		"bad status":    `{"job_id":"7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f","org_id":"3f6e2b1a-9c8d-4e7f-a6b5-c4d3e2f1a0b9","status":"done"}`,
		"bad uuid":      `{"job_id":"nope","org_id":"3f6e2b1a-9c8d-4e7f-a6b5-c4d3e2f1a0b9","status":"failed"}`,
	}
	for name, body := range cases {
		if err := c.Validate(EventImportProcessed, []byte(body)); err == nil {
			t.Errorf("%s: expected a validation error", name)
		}
	}
}

func TestEventsHaveSchemasAndTopics(t *testing.T) {
	c, err := LoadContract()
	if err != nil {
		t.Fatal(err)
	}
	topics := map[string]bool{}
	for event, topic := range TopicFor {
		if _, ok := c.schemas[strings.TrimPrefix(event, "expendit.")]; !ok {
			t.Errorf("no schema for %s", event)
		}
		topics[topic] = true
	}
	// The shared bus has three lanes (system-design.md §16 I-18).
	for topic := range topics {
		if topic != TopicUploads && topic != TopicRequests && topic != TopicResults {
			t.Errorf("%s is not a lane of the shared bus", topic)
		}
	}
	for event := range TopicFor {
		if !strings.HasPrefix(event, Product) {
			t.Errorf("%s lacks the product prefix", event)
		}
	}
}
