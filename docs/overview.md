# Project Overview

Expendit is an open-source expense-tracking application. This document describes
the high-level architecture and the responsibilities of each component. For
local development instructions, see [setup.md](./setup.md).

## Components

Expendit is a monorepo with three application surfaces backed by a single API.

### `api/common` — Go backend API

The backend is a Go service (module `expendit-server`) built with the
[Gin](https://gin-gonic.com/) web framework. It is the source of truth for all
application data and business logic.

Responsibilities:

- **Authentication & users** — signup, signin, password reset, JWT-based auth,
  and Google OAuth.
- **Expenses, income & categories** — CRUD and querying of financial records.
- **Statement imports** — CSV and PDF parsing, duplicate detection, and
  automatic categorization of imported transactions.
- **AI-assisted features** — expense summaries and categorization powered by
  Google Gemini and Groq.
- **Reporting** — aggregated spend reports and trends.

Key technologies:

| Concern         | Technology                                  |
| --------------- | ------------------------------------------- |
| Web framework   | Gin                                         |
| Database        | MongoDB (`go.mongodb.org/mongo-driver`)     |
| Auth            | JWT (`golang-jwt`), Google OAuth            |
| Rate limiting   | Redis (with in-memory fallback)             |
| Email           | SMTP (`gomail`)                             |
| RPC             | gRPC / Protobuf (`user` service)            |
| File parsing    | `ledongthuc/pdf`, `xuri/excelize`           |

The service listens on port `9000` by default.

### `web` — Next.js web application

The web app is a [Next.js](https://nextjs.org/) application (React + TypeScript)
that contains both the public marketing site and the authenticated dashboard.
It talks to the Go API over HTTP (via an axios client) and gRPC-web. Tests run
with Jest.

The app listens on port `3000` by default.

### `mobile` — Flutter application (planned)

The `mobile/` directory reserves space for the cross-platform Flutter app
(`mobile/flutter`) and its native shells (`mobile/android`, `mobile/ios`). These
are placeholders today and will consume the same Go API.

## Directory layout

```
expendit/
├── api/common/     Go backend API (Gin, MongoDB)
├── web/            Next.js web application
├── mobile/         Flutter app + native shells (planned)
├── deploy/         Docker, Helm, and Terraform configuration
├── docs/           Documentation
└── scripts/        Developer and CI scripts
```

### Backend service naming

The backend lives under `api/`. Services are named by **function**, not by
language. The current (and only) service is `api/common`. Any future backend
service would be added as `api/<function>` (for example `api/billing`), never
named after the language it is written in.

## Deployment

Deployment configuration lives under `deploy/`:

- `deploy/docker/` — container and Docker Compose configuration.
- `deploy/helm/` — Kubernetes Helm chart(s). A single chart is intended to
  deploy all services together.
- `deploy/terraform/` — Infrastructure as Code.

These directories are currently placeholders and will be populated as the
deployment story matures.

## Data flow (statement import example)

1. A user uploads a CSV or PDF bank statement from the web app.
2. The API parses the file (`services/csvParser`, `services/pdfParser`).
3. Transactions are de-duplicated (`services/duplicateDetector`) and
   categorized (`services/categorizationEngine`, optionally AI-enhanced).
4. The user reviews and confirms the imported transactions.
5. Reports and summaries are generated from the stored records.
