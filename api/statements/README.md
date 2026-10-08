# api/statements

Node (NestJS) thin gateway for receipts, bank-statement files and company
financial statements (system-design.md §4, S-1). It owns nothing: no
database, no Redis, no state between requests.

One route, behind `api.expendit.cuesoft.io/api/v1/uploads` (S-14):

```
POST /api/v1/uploads
Upload-Ticket: v1.<claims>.<signature>
Content-Type: multipart/form-data   (one part named "file")

202 {"id": "<job or statement id>", "kind": "import_job", "status": "processing"}
```

The flow (system-design.md §6.1):

1. `api/common` authorizes the upload (role, AI consent, rate limits,
   quota), creates the job or statement, and returns a short-lived signed
   ticket ([format](../common/contract/upload-ticket.md)).
2. This service verifies the ticket with `common`'s public key, with no
   call back, then checks the size before reading the body.
3. It checks the file type from its magic bytes, and downscales receipt
   images larger than 2048 px.
4. It writes the file to `<prefix>/tmp/<target id>/<ticket id>` in object
   storage, then publishes a pointer on `expendit.upload.received`.

`api/common` takes it from there: it marks the ticket used, hands the job to
`api/analytics`, and deletes the file once it has been parsed (S-4).

| Status | Code | When |
| --- | --- | --- |
| 401 | `invalid_ticket` / `ticket_expired` | missing, forged, unknown key, or past `exp` |
| 413 | `file_too_large` | over the ticket's `max_bytes` (15 MB, S-6) |
| 415 | `unsupported_type` | magic bytes don't match the declared type |
| 503 | `storage_unavailable` / `queue_unavailable` | object storage or Kafka down |

## Layout

The base every service shares, then this service's own modules:

```
src/main.ts            entry: JSON logs, CORS contract, error envelope
src/app.module.ts
src/config/            typed env config, fails fast on missing settings
src/health/            /health, /ready (Kafka connected, bucket reachable)
src/kafka/             topics + idempotent producer with envelope validation
src/storage/           object store: gcs (cloud) | s3 (MinIO)
src/contract/          JSON Schema validation (schemas from api/common/contract)
src/telemetry/         JSON logger; the never-log list applies
src/errors/            ApiError + the envelope filter

src/ticket/            Ed25519 ticket verification
src/filetype/          magic-byte detection
src/upload/            the route, the ticket-first body reader, the hand-off
```

## Run

```sh
cp .env.example .env     # add UPLOAD_TICKET_PUBLIC_KEYS from api/common
npm install
npm run dev
```

From the repo root, `docker compose up statements` runs it with its
dependencies.

## Test

```sh
npm run typecheck && npm run lint && npm test
```

The end-to-end spec boots the real Nest app with fake storage and Kafka,
signs tickets with a throwaway key, and validates every published message
against the contract schemas.
