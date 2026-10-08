package kafka

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/fs"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/cuesoftinc/expendit/api/common/contract"
)

const schemaBase = "https://expendit.cuesoft.io/contract/"

// Contract validates envelopes and payloads against the embedded schemas.
type Contract struct {
	schemas map[string]*jsonschema.Schema
}

func LoadContract() (*Contract, error) {
	compiler := jsonschema.NewCompiler()
	compiler.AssertFormat()
	names, err := fs.Glob(contract.Schemas, "*.schema.json")
	if err != nil {
		return nil, err
	}
	for _, name := range names {
		raw, err := contract.Schemas.ReadFile(name)
		if err != nil {
			return nil, err
		}
		doc, err := jsonschema.UnmarshalJSON(bytes.NewReader(raw))
		if err != nil {
			return nil, fmt.Errorf("%s: %w", name, err)
		}
		if err := compiler.AddResource(schemaBase+name, doc); err != nil {
			return nil, err
		}
	}
	c := &Contract{schemas: map[string]*jsonschema.Schema{}}
	for _, name := range names {
		schema, err := compiler.Compile(schemaBase + name)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", name, err)
		}
		c.schemas[strings.TrimSuffix(name, ".schema.json")] = schema
	}
	return c, nil
}

// Validate checks raw JSON against the named schema ("envelope" or a topic).
func (c *Contract) Validate(name string, raw []byte) error {
	schema, ok := c.schemas[strings.TrimPrefix(name, "expendit.")]
	if !ok {
		return fmt.Errorf("no schema named %s", name)
	}
	doc, err := jsonschema.UnmarshalJSON(bytes.NewReader(raw))
	if err != nil {
		return err
	}
	return schema.Validate(doc)
}

// ValidateValue marshals v and validates it.
func (c *Contract) ValidateValue(name string, v any) ([]byte, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	return raw, c.Validate(name, raw)
}
