# Local Setup

## Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose (recommended path)
- For native development: [Go](https://go.dev/) 1.25+ (`api/common`),
  [Node.js](https://nodejs.org/) 20+ (`web`), [MongoDB](https://www.mongodb.com/),
  and [Redis](https://redis.io/) (optional — rate limiting falls back to in-memory)

## Configuration

Each service ships an `.env.example`; copy it and fill in real values. Never
commit real `.env` files — `make up` reads the root `.env`.

### Backend (`api/common`)

| Variable | Description |
| -------- | ----------- |
| `PORT` | API port (default `8080`) |
| `MONGODB_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `EMAIL_FROM` | From address for outbound email |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_PORT` | SMTP credentials |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GEMINI_API_KEY` | Google Gemini API key (AI summaries) |
| `GROQ_API_KEY` | Groq API key (AI categorization) |
| `REDIS_URL` | Redis connection string (optional) |
| `FRONTEND_URL` | Web app URL for CORS/redirects |

### Web (`web`)

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_BASE_URL` | Base URL of the API (e.g. `http://localhost:8080`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## Quick start (Docker)

```bash
cp .env.example .env
make up        # build + start mongo, redis, api-common (:8080), web (:3000)
make logs      # follow logs
make down      # stop and remove
```

- API: http://localhost:8080 — health `/health`, readiness `/ready`
- Web: http://localhost:3000

## Running natively (without Docker)

Start MongoDB and Redis (e.g. `docker run -d -p 27017:27017 mongo:7` and
`docker run -d -p 6379:6379 redis:7`), then:

```bash
# Backend — listens on :8080 (override with PORT)
cd api/common && go run ./cmd/server

# Web
cd web && npm install && npm run dev
```
