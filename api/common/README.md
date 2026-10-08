# api/common

Go: the **CRUD owner** (system-design.md §4, S-1, S-2). It is the only
service that touches Postgres. It authenticates users (Firebase, X-1),
enforces the org-role matrix, owns every write, and stores the decisions
`api/analytics` makes exactly as made. It never decides anything about
financial data itself (S-7).

One image, two entry points:

| Binary | Runs | Where |
| --- | --- | --- |
| `server` | HTTP API, Kafka consumers, outbox publisher | Cloud Run service, **min 1** (it consumes; S-12) |
| `jobs <name>` | one sweep, then exits | Cloud Run jobs + Cloud Scheduler (§6.7) |

## Layout

The base every service shares, then this service's own packages:

```
cmd/server/            entry: config → deps → migrate → seed → serve + consume + publish
cmd/jobs/              reaper | tmp-cleanup | retention | migrate | republish-rulesets
cmd/ticketkey/         generates an upload-ticket key pair
internal/config/       typed env config, fails fast on missing settings
internal/kafka/        topics, envelope + claim-check, producer, consumers, contract validation
internal/storage/      object store: gcs (cloud) | s3 (MinIO)
contract/              JSON Schemas for every Kafka message (owned here; embedded)

internal/app/          wiring shared by the binaries
internal/auth/         Firebase ID-token verification
internal/middleware/   request id, logs, recovery, CORS contract, auth + org resolution
internal/router/       the HTTP surface (/api/v1, /health, /ready)
internal/handler/      thin handlers: decode → service → encode
internal/service/      CRUD rules, authorization, hand-offs to analytics
internal/repository/   all SQL; every query runs org-scoped under RLS
internal/model/        API shapes (mirrors web/src/models)
internal/ticket/       Ed25519 upload-ticket issuer (S-5)
internal/outbox/       transactional outbox publisher (§6.6)
internal/ratelimit/    Redis fixed-window limits; fails open (§9.2)
internal/sweep/        scheduled jobs (§6.7)
migrations/            forward-only SQL, applied at start under an advisory lock
```

## The HTTP surface

Paths follow the web contract (`web/src/models/repositories`) under `/api/v1`.
Every route needs `Authorization: Bearer <Firebase ID token>`. `X-Org-Id`
picks the org; without it, the user's personal org is used. Another org's
id answers `404`, never `403` (engineering.md §2).

| Area | Routes |
| --- | --- |
| Identity | `GET /me` · `GET,POST /orgs` · `PATCH /orgs/{id}` · `GET,POST /orgs/{id}/members` · `PATCH,DELETE /orgs/{id}/members/{userId}` · `GET,POST /consent` |
| Ledger | `GET,POST /categories` · `GET,PUT,DELETE /categories/{id}` · `POST /categories/{id}/merge,archive,unarchive` · `GET,POST /transactions` · `GET,PUT,DELETE /transactions/{id}` · `GET /report/monthly` · `GET /report/category` |
| Imports | `POST /import` → `{job_id, upload_ticket}` · `GET /import` · `GET,DELETE /import/{jobId}` · `POST /import/{jobId}/confirm` · `PUT /import/transactions/{id}/category,include` |
| Statements | `POST /statements` (upload → ticket, or manual line items) · `GET /statements` · `GET /statements/{id}` · `GET,PATCH /statements/{id}/mapping` · `POST /statements/{id}/confirm` |
| Computed | `GET /ratios?period=` · `POST /ratios/compute` · `GET,PUT /tax/profile` · `GET /tax/estimates` |

The file itself never comes here: `POST /import` and `POST /statements`
return a ticket, and the client sends the file to `api/statements`
(`POST /api/v1/uploads`). Ratios and tax estimates are computed by
`api/analytics`, so reads return the stored figures with
`"status": "current" | "recomputing"` and queue a recomputation when the
org's data changed since (§6.5).

## Kafka

| Consumes | Does |
| --- | --- |
| `expendit.upload.received` | marks the ticket used, job → `processing`, queues `import.ready` / `statement.ready` with reference data |
| `expendit.import.processed` | stores staged rows, summary and anomalies; deletes the raw file (S-4) |
| `expendit.statement.mapped` | stores line items and the v1 validation; deletes the raw file |
| `expendit.compute.results` | stores validation, ratio reports and tax estimates if computed from the current data version |

Everything it produces goes through the transactional outbox, so a message
is sent if and only if its write committed.

## Run

```sh
cp .env.example .env      # then: go run ./cmd/ticketkey for the ticket key
set -a; . ./.env; set +a
go run ./cmd/server
```

From the repo root, `docker compose up common` runs it with Postgres,
Kafka, Redis, MinIO and the Firebase auth emulator.

Use a **non-superuser** database role: superusers bypass row-level security.

## Test

```sh
go vet ./... && go test ./...
```

`internal/service` has an integration test that runs the import and
statement flows against a real Postgres as a non-superuser (so RLS is
enforced). It uses `TEST_DATABASE_URL` (a superuser URL; the test creates
its own role and database) or starts an embedded Postgres. `go test -short`
skips it.

## Not built yet

- Bank linking (Mono exchange, KMS-encrypted tokens, sync sweep, webhooks;
  migration phase C). The tables exist (`bank_link`, `provider_event`).
- Tax filings (`/tax/filings`, TAX-002), reports and downloads
  (`/reports`), and data rights (`/account/export`, `/account/purge`). Tables
  exist; routes come with their phases.
- OpenTelemetry export (X-9): logs are JSON on stdout today.
