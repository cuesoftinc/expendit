# api/analytics

Python (FastAPI) processing service: **every decision** in Expendit
(system-design.md §4, S-7). It has no database and no public ingress. Work
arrives over Kafka with the reference data it needs, and results go back to
`api/common`, which stores them exactly as computed. Files are read from the
temporary object store (`tmp/`) that `api/statements` wrote to (S-2, S-3).

Two worker pools from one image (D8), selected by `ANALYTICS_POOL`:

| Pool | Consumes | Produces | Work |
| --- | --- | --- | --- |
| `extract` | `expendit.import.ready`, `expendit.statement.ready` | `expendit.import.processed`, `expendit.statement.mapped` | parse CSV/XLSX/PDF/images, duplicates, categories, anomalies, import summary + narrative, statement row mapping |
| `compute` | `expendit.compute.requested`, `expendit.config.rulesets` (replayed from offset 0) | `expendit.compute.results` | statement derivations + validation, ratios, PIT/CIT/VAT estimates and filing figures, dashboard summary |

`all` runs both in one process (compose, Helm).

## Layout

The base every service shares, then this service's own packages:

```
app/main.py            entry: lifespan wires config → storage → Kafka → pools
app/config.py          typed env config, fails fast on missing settings
health/                /health, /ready (ready = every consumer running)
kafka/                 topics, envelope + claim-check, producer, consumer
storage/               object store: gcs (cloud) | s3 (MinIO)
contract/              JSON Schema validation (schemas from api/common/contract)
telemetry/             JSON logs; the never-log list applies

extract/               the extract pool
  pipeline.py          import.ready → import.processed
  parse/               CSV/XLSX, PDF regex fallback, image MIME
  dedup/               flows/import.md §4 duplicate rule
  categorize/          keyword rules, then AI
  anomaly/             flows/import.md §7 rules registry
  summary/             totals + AI narrative
  mapping/             statement rows → canonical keys (statement.ready)
  ai/                  Vertex (ADC) | Groq | Gemini
compute/               the compute pool
  handler.py           compute.requested → compute.results
  registry/            line-item vocabulary + ratio registry (line-items.md)
  derive/              statement derivations + identity checks
  ratios/              the 22 metrics with traces and bands
  tax/                 rule sets (from Kafka), PIT/CIT/VAT, authorities
  summary/             dashboard AI summary
tests/
```

## Run

```sh
cp .env.example .env        # points at the compose Kafka and MinIO
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8082
```

From the repo root, `docker compose up analytics` runs it with its
dependencies.

## Config

See [.env.example](.env.example). Required: `KAFKA_BROKERS`,
`STORAGE_BUCKET`, `STORAGE_PREFIX`. AI is optional: with no provider set,
CSV and PDF imports still work (PDFs through the regex parser), and image
imports fail with `ai_unavailable`. AI runs only when the message says
`ai_allowed` (the user's `ai_processing` consent, E-3).

## Test

```sh
pip install -r requirements.txt pytest pytest-asyncio ruff
pytest
ruff check .
```

Tests validate every message they produce against the schemas in
`api/common/contract` (`CONTRACT_DIR` overrides the location).

## Not built yet

- PDF and image **statements** (company financials) need AI table
  extraction; they fail with `ai_unavailable` until it lands. CSV and XLSX
  statements work.
- Runway from cash-flow statements (when 3+ confirmed cash-flow periods
  exist) returns n/a; the ledger-burn path works.
- Every tax rule set ships **unsigned** (`estimate_only`), so filing figures
  are refused with `ruleset_unsigned` until a licensed practitioner signs
  them off (tax-engine.md).
