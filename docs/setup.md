# Local Development Setup

This guide walks through setting up Expendit for local development. For an
architectural overview, see [overview.md](./overview.md).

## Prerequisites

Install the following before you start:

- [Git](https://git-scm.com)
- [Go](https://go.dev/) **1.25+** — for the `api/common` backend
- [Node.js](https://nodejs.org/) **20+** and npm — for the `web` app
- [MongoDB](https://www.mongodb.com/) — the backend database
- [Redis](https://redis.io/) — optional, used for rate limiting (falls back to
  in-memory if unavailable)
- [Docker](https://www.docker.com/) & Docker Compose — optional, for running
  dependencies or the full stack in containers

## 1. Clone the repository

```bash
git clone https://github.com/cuesoftinc/expendit.git
cd expendit
```

## 2. Install dependencies

From the repository root:

```bash
make install
```

This installs Go module dependencies for `api/common` and npm dependencies for
`web`. Run `make help` to list all available targets.

## 3. Configure environment variables

Each service ships an `.env.example` file. Copy it and fill in real values.
**Never commit your real `.env` files.**

### Backend (`api/common`)

```bash
cp api/common/.env.example api/common/.env
```

| Variable            | Description                                        |
| ------------------- | -------------------------------------------------- |
| `PORT`              | API port (default `9000`)                          |
| `MONGODB_URL`       | MongoDB connection string                          |
| `JWT_SECRET`        | Secret used to sign JWTs                            |
| `EMAIL_FROM`        | From address for outbound email                    |
| `SMTP_Host`         | SMTP server host                                   |
| `SMTP_User`         | SMTP username                                       |
| `SMTP_Password`     | SMTP password                                       |
| `SMTP_Port`         | SMTP port (e.g. `587`)                             |
| `GOOGLE_CLIENT_ID`  | Google OAuth client ID                             |
| `GEMINI_API_KEY`    | Google Gemini API key (AI summaries)               |
| `GROQ_API_KEY`      | Groq API key (AI categorization)                   |
| `REDIS_URL`         | Redis connection string (optional)                 |
| `FRONTEND_URL`      | Web app URL for CORS/redirects (e.g. `http://localhost:3000`) |

### Web (`web`)

```bash
cp web/.env.example web/.env.local
```

| Variable                        | Description                             |
| ------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_BASE_URL`          | Base URL of the API (e.g. `http://localhost:9000`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`  | Google OAuth client ID                  |

## 4. Start MongoDB and Redis

Run them however you prefer. For a quick start with Docker:

```bash
docker run -d --name expendit-mongo -p 27017:27017 mongo:7
docker run -d --name expendit-redis -p 6379:6379 redis:7
```

## 5. Run the applications

### Everything at once

```bash
make dev
```

This starts the API and web app together. The API runs on
`http://localhost:9000` and the web app on `http://localhost:3000`.

### Individually

```bash
# Backend only
make dev-api      # equivalent to: cd api/common && go run main.go

# Web only
make dev-web      # equivalent to: cd web && npm run dev
```

## 6. Run tests and linting

```bash
make test         # run all tests
make lint         # lint all workspaces

# Or per workspace:
make test-api     # cd api/common && go test ./...
make test-web     # cd web && npm test
```

## Troubleshooting

- **API cannot connect to MongoDB** — confirm MongoDB is running and
  `MONGODB_URL` is correct.
- **Rate limiting errors / Redis warnings** — Redis is optional; the limiter
  falls back to in-memory. Set `REDIS_URL` to use a shared limiter.
- **CORS errors from the web app** — ensure `FRONTEND_URL` (API) and
  `NEXT_PUBLIC_BASE_URL` (web) point at each other.
- **Port already in use** — change `PORT` (API) or run the web app with a
  different port (`npm run dev -- -p 3001`).

## Docker

Container build contexts have their own `.dockerignore` files. Deployment and
Compose configuration will live under `deploy/docker/`. See the `docker-*`
targets in the [Makefile](../Makefile) (`make docker-up`, `make docker-build`).
