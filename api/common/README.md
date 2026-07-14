# Expendit API (`api/common`)

Go + Gin REST API backing the Expendit expense tracker: auth (JWT + Google
sign-in), expenses, income, categories, reports, statement imports, and AI
summaries. Data lives in MongoDB; rate limiting uses Redis with an in-memory
fallback.

## Layout

```
cmd/server/main.go   entrypoint — slog JSON logging, /health + /ready, graceful shutdown
internal/handler     HTTP handlers        internal/service   import/AI engines
internal/router      route groups (auth scoped per group)
internal/middleware  auth, CORS, rate limiting, request-id, logging
internal/model       Mongo models         internal/database  Mongo client
internal/helper      JWT session tokens   internal/util      JWT reset tokens, mail
internal/validation  password policy
```

## Run

From the repo root (recommended — starts MongoDB, Redis, API, and web):

```bash
cp .env.example .env
make up            # api on http://localhost:8080
```

Natively (requires MongoDB reachable via MONGODB_URL, reads `.env` in this dir):

```bash
go run ./cmd/server
```

Health: `GET /health` · readiness: `GET /ready` — both public; all domain
routes require a Bearer JWT.

## Configuration

Set via environment (see the root `.env.example`): `PORT` (default 8080),
`MONGODB_URL`, `REDIS_URL`, `JWT_SECRET`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`,
`GEMINI_API_KEY`/`GROQ_API_KEY` (AI summaries), `EMAIL_FROM`, `SMTP_HOST`,
`SMTP_USER`, `SMTP_PASSWORD`, `SMTP_PORT` (password reset email).

## Test

```bash
go test ./...
```
