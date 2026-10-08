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
  "data": { "...": "the topic payload" }
}
```

When the serialized `data` is over 512 KB the producer writes it to
`expendit/<env>/compute/<id>.json` in the bucket and sends
`"data_ref": {"bucket", "key"}` instead (S-3). Consumers resolve the ref, then
validate `data` against the topic schema.

## Topics

| Topic | Key | Retention | Producer → consumer | Schema |
| --- | --- | --- | --- | --- |
| `expendit.config.rulesets` | ruleset id | compacted | common (outbox) → analytics | [config.rulesets](config.rulesets.schema.json) |
| `expendit.upload.received` | ticket id | 24 h | statements → common | [upload.received](upload.received.schema.json) |
| `expendit.import.ready` | job id | 24 h | common (outbox) → analytics extract | [import.ready](import.ready.schema.json) |
| `expendit.import.processed` | job id | 24 h | analytics → common | [import.processed](import.processed.schema.json) |
| `expendit.statement.ready` | statement id | 24 h | common (outbox) → analytics extract | [statement.ready](statement.ready.schema.json) |
| `expendit.statement.mapped` | statement id | 24 h | analytics → common | [statement.mapped](statement.mapped.schema.json) |
| `expendit.compute.requested` | org id | 24 h | common (outbox) → analytics compute | [compute.requested](compute.requested.schema.json) |
| `expendit.compute.results` | org id | 24 h | analytics → common | [compute.results](compute.results.schema.json) |

Shared types (ids, dates, object refs, anomalies, traces) are in
[defs.schema.json](defs.schema.json).

## Changing a schema

1. Additive change (new optional field): edit the schema, keep `version`.
2. Breaking change: bump the envelope `version` the producer sends, and make
   the consumer accept both versions until every producer is upgraded.
3. Update the matching example in `examples/`. Every service's tests validate
   the examples, so a schema and its consumers can't drift silently.
