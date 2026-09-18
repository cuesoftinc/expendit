# api/process

Stateless file-processing engine for expense receipts (PDF/image/CSV/XLSX).
Consumes raw files from `api/common` (which relays what `api/intake`
uploaded, plus reference data) over Aiven Kafka, runs extraction +
categorization + duplicate + anomaly decisions, and publishes the result
back for `api/common` to persist. Owns no database of its own; every
decision it makes travels back to `api/common` in the outbound message.

## Layout

```
app/main.py                FastAPI + lifespan (starts the Kafka consumer)
app/config.py               typed env config
model/schemas.py            Kafka message contracts (pydantic)
kafka/client.py              consumer (expendit.receipts.ready) + producer
                              (expendit.receipts.processed)
router/                      empty until an HTTP surface is needed —
                              this service is Kafka-driven, not request/response
service/
  raw_transaction.py           shared RawTransaction dataclass
  csv_parser.py                 CSV/XLSX parsing (ported from csvParser.go)
  pdf_parser.py                  PDF text extraction + regex parser (pdfParser.go)
  ai_enhancer.py                  Groq/Gemini text + vision calls (aiEnhancer.go)
  categorization_engine.py         category decision (categorizationEngine.go)
  duplicate_detector.py             exact/fuzzy duplicate decision (duplicateDetector.go)
  anomaly_engine.py                  statistical anomaly decision (anomalyEngine.go)
  summary_generator.py                totals/trends aggregation (summaryGenerator.go)
  pipeline.py                          orchestrates all of the above
```

## Run

```
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8082
```

## What's implemented

Every decision engine from the old Go monolith's import pipeline is ported
and unit-verified (parsing, categorization, duplicate detection, anomaly
detection, summary generation), wired end to end through `pipeline.py`, and
consumed/produced over Kafka via `kafka/client.py`.

## Known gaps, not silently papered over

- **AI calls still go direct to Groq/Gemini with raw API keys** (the old
  monolith's only path). Per org canon, cloud deployments should call
  **Vertex AI** via ADC instead, with Groq/Gemini as the self-host fallback
  only, this port kept the self-host path as-is and did not add the Vertex
  path.
- Not tested against a live Aiven Kafka instance in this session, only
  unit-tested (parsing/categorization/dedup/anomaly/summary logic verified
  directly; `pip install -r requirements.txt` and app import both verified).
