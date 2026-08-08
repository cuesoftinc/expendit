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

### Trusted proxies

Rate-limit buckets are keyed on a client IP, and behind a proxy that address
comes from a forwarding header the caller can write. `gin.New()` trusts every
proxy, so `c.ClientIP()` would hand back the caller's own leftmost
`X-Forwarded-For` entry and one varied header per request would defeat every
limit. `internal/clientip` replaces it, using the same contract as cueprise:

| Variable | Default | Meaning |
| --- | --- | --- |
| `TRUST_PROXY_HEADERS` | `false` | Whether forwarding headers are read at all. |
| `TRUSTED_PROXY_CIDRS` | empty | CIDRs whose `X-Forwarded-For` entries may be consumed, walked right to left until the chain leaves the trusted ranges. |
| `TRUSTED_PROXY_HOPS` | `0` | Positional fallback for chains with no stable peer range. |
| `CLOUDFLARE_PROXY_CIDRS` | empty | CIDRs where Cloudflare is the immediate peer and `CF-Connecting-IP` is authoritative. |

- **Default is the network peer.** Unforgeable, but coarse behind shared
  ingress — users on one egress address share a bucket. Enable the headers
  once the ingress ranges are verified.
- **Prefer CIDRs over hops.** Cloud Run ingress is open, so the same origin is
  reachable both through Cloudflare and directly; the direct chain is one hop
  shorter, and a count tuned for the Cloudflare path resolves to a forged entry
  on the direct one. `TRUSTED_PROXY_HOPS` stays `0` unless every ingress path
  is length-enforced by infrastructure.
- On Cloud Run behind Cloudflare, set `TRUSTED_PROXY_CIDRS` to the front-end
  range that terminates the connection plus Cloudflare's published ranges
  (<https://www.cloudflare.com/ips/>); confirm the observed peer address before
  trusting a range. Use `CLOUDFLARE_PROXY_CIDRS` on the self-hosted
  helm/compose path, where Cloudflare is the immediate peer.
- A chain that cannot be attributed (missing, malformed, or ending inside a
  trusted range) falls back to the peer. That over-groups; it never lets a
  caller mint a fresh bucket. Startup fails on a configuration that would
  silently make attribution forgeable or dead.

## Test

```bash
go test ./...
```
