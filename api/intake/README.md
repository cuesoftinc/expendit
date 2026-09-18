# api/intake

Upload gateway for expense receipts (PDF/image). Owns the multipart upload
endpoint and hands raw file bytes to `api/process` over Aiven Kafka pub/sub.
Owns no persisted state — `api/common` is the CRUD/data owner for import
jobs and transactions.

## Layout

```
src/main.ts              bootstrap: CORS, $PORT
src/app.module.ts         root module
src/health/                /health, /ready
src/auth/                  JWT verification (shares api/common's JWT_SECRET)
src/receipts/               POST /receipts: validate, mint job id, publish
src/kafka/                  Kafka producer (expendit.receipts.uploaded)
```

## Run

```
cp .env.example .env
npm install
npm run start:dev
```

## What's implemented

- `POST /receipts` (multipart, field `file`, 10 MB cap, `Idempotency-Key`
  header support): mints a job id, base64-encodes the file, publishes to
  Kafka, returns `202 { jobId }`.
- JWT verification against the same `JWT_SECRET` api/common signs with.

## Known gaps, not silently papered over

- **Auth is signature+expiry only.** api/common's `Authenticate()` middleware
  also checks the token against a DB-stored session (so logout actually
  revokes it); this guard doesn't, since that would mean either giving
  intake its own Mongo connection or a synchronous call back to api/common,
  both of which cut against this service's design. A token revoked by
  logout is still accepted here until this gets a real fix.
- **Idempotency cache is in-memory, single-instance.** A multi-replica
  deployment needs a shared store (e.g. Redis) for retries to actually
  dedupe across instances.
- Not tested against a live Aiven Kafka instance in this session, only
  built/typechecked.
