# Kafka message contract

JSON Schemas (draft 2020-12) for every message between the three services
(system-design.md §5.3, S-13). They replace the hand-kept Pydantic, TS and Go
copies: each service validates what it produces and what it consumes against
these files.

`api/common` owns them because it owns the data. The other two services get
them at build time: their images are built from the repository root and copy
`api/common/contract/` in (see each service's Dockerfile).

## Envelope

Every message is an [envelope](envelope.schema.json):

```json
{
  "type": "expendit.import.ready",
  "version": 1,
  "id": "6f1c…",
  "produced_at": "2026-10-05T10:00:00Z",
  "data": { "...": "the event payload" }
}
```

The producer writes `data` to `expendit/<env>/compute/<id>.json` in the
bucket (the gateway: `tmp/claims/`) and sends `"data_ref": {"bucket",
"key"}` instead (S-3; always, on the shared bus). Consumers resolve the ref, then
validate `data` against the schema named by `type`.

## Events and topics

`type` names the **event**, and each event has its own schema. Expendit's
events travel on the three lanes of the CueLABS shared message bus, which
Apparule and Upstat use too (system-design.md §5.3, §16 I-18; the rules are
in the CueLABS delivery standard's `shared-messaging.md`). A consumer reads
`type` first and skips, without validating, anything that isn't an Expendit
event it handles.

| Event (schema) | Lane | Key | Producer → consumer |
| --- | --- | --- | --- |
| [upload.received](upload.received.schema.json) | `cuelabs.uploads` | ticket id | statements → common |
| [import.ready](import.ready.schema.json), [statement.ready](statement.ready.schema.json) | `cuelabs.requests` | job / statement id | common (outbox) → analytics extract |
| [compute.requested](compute.requested.schema.json) | `cuelabs.requests` | org id | common (outbox) → analytics compute |
| [system.heartbeat](system.heartbeat.schema.json) | `cuelabs.requests` | `heartbeat` | common's reaper → nobody (I-17) |
| [import.processed](import.processed.schema.json), [statement.mapped](statement.mapped.schema.json) | `cuelabs.results` | job / statement id | analytics extract → common |
| [compute.results](compute.results.schema.json) | `cuelabs.results` | org id | analytics compute → common |

Every payload except the heartbeat's goes by `data_ref`: other products can
read the lanes, and storage permissions keep Expendit's data to itself.

Every topic keeps messages for 24 hours (or the plan's fixed retention).
Tax rule sets are not a topic: tax compute requests carry them in
`rulesets` ([config.rulesets](config.rulesets.schema.json) is the schema of
one set; the seed files in `examples/` keep the envelope form).

Shared types (ids, dates, object refs, anomalies, traces) are in
[defs.schema.json](defs.schema.json).

## Changing a schema

1. Additive change (new optional field): edit the schema, keep `version`.
2. Breaking change: bump the envelope `version` the producer sends, and make
   the consumer accept both versions until every producer is upgraded.
3. Update the matching example in `examples/`. Every service's tests validate
   the examples, so a schema and its consumers can't drift silently.
