# Local Setup

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose (the recommended path)
- For native development: [Go](https://go.dev/) 1.26+ (`api/common`),
  [Node.js](https://nodejs.org/) 24+ (`web`, `api/statements`),
  [Python](https://www.python.org/) 3.12+ (`api/analytics`)

## Configuration

Every service ships an `.env.example` with its native-run variables (names
per [system-design.md §10.3](system-design.md#103-environment-variables-fleet-names-only)).
Compose reads the root `.env`; never commit a real one.

```bash
cp .env.example .env
```

The root example already holds a **local-only** upload-ticket key pair, so
compose works as is. For anything else, generate a pair with
`cd api/common && go run ./cmd/ticketkey <kid>`.

## Quick start (Docker)

```bash
make up        # build + start the stack below
make logs      # follow logs
make down      # stop and remove
```

| Service | URL | What |
| --- | --- | --- |
| web | http://localhost:3000 | Next.js app on the real backend (sign in with the emulator's Google popup) |
| common | http://localhost:8080 | API (`/health`, `/ready`, `/api/v1/*`) |
| statements | http://localhost:8081 | upload gateway (`POST /api/v1/uploads`) |
| analytics | http://localhost:8082 | health only; works over Kafka |
| postgres | localhost:5432 | app role `expendit_app` / `expendit_app`, db `expendit` |
| kafka | localhost:9094 | topics created by `kafka-init` |
| minio | http://localhost:9001 | console (`minioadmin` / `minioadmin`) |
| firebase-auth | localhost:9099 | auth emulator (Google sign-in) |

A `jobs` container runs the sweeps (reaper, tmp-cleanup, retention) on a
loop. Cloud runs them on Cloud Scheduler.

AI is optional locally. Set `GROQ_API_KEY` or `GEMINI_API_KEY` in `.env` to
enable AI categorization, PDF extraction and receipt images. Without one,
CSV and PDF (regex) imports still work.

## Running a service natively

Start the dependencies with `docker compose up -d postgres kafka kafka-init redis minio firebase-auth`, then:

```bash
# api/common, :8080 (migrations run at start)
cd api/common && cp .env.example .env && set -a && . ./.env && set +a && go run ./cmd/server

# api/statements, :8081
cd api/statements && cp .env.example .env && npm install && npm run dev

# api/analytics, :8082
cd api/analytics && cp .env.example .env && pip install -r requirements.txt && uvicorn app.main:app --port 8082

# web, :3000 against the real backend: Firebase emulator sign-in, /api/v1
# proxied to common (:8080) and uploads to statements (:8081)
cd web && cp .env.example .env.local && npm install && npm run dev

# web in TEST_MODE: the in-app mock API, no backend needed
cd web && NEXT_PUBLIC_TEST_MODE=1 npm run dev
```

## Tests

| Service | Command |
| --- | --- |
| api/common | `go vet ./... && go test ./...` (`-short` skips the Postgres integration test) |
| api/statements | `npm run typecheck && npm run lint && npm test` |
| api/analytics | `pytest && ruff check .` |
| web | `npm run lint && npm run typecheck && npm test`; e2e: `npm run test:e2e` |
