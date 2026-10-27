// Package contract embeds the Kafka message JSON Schemas so api/common
// validates what it produces and consumes against the same files the other
// services copy in at build time.
package contract

import "embed"

// Schemas holds every *.schema.json and the examples used by tests.
//
//go:embed *.schema.json examples/*.json
var Schemas embed.FS
