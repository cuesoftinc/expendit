# Expendit

Expendit is an open-source application for estimating and tracking personal and
business expenses. Record expenses on the go, categorize them, import statements,
and generate real-time reports for better financial management.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## Overview

Expendit is a monorepo made up of three application surfaces backed by a single
API:

- A **Go REST API** that handles authentication, expenses, income, categories,
  statement imports, AI-assisted summaries, and reporting.
- A **Next.js web application** with a marketing site and an authenticated
  dashboard.
- A **Flutter mobile application** (planned) that shares the same API.

## Architecture

```
                 +---------------------+
                 |   Next.js web app   |
                 |      (web/)         |
                 +----------+----------+
                            |
                            | HTTPS / gRPC-web
                            v
+----------------+   +------+------------------+   +----------------+
| Flutter mobile |-->|   Go REST API (Gin)     |-->|    MongoDB     |
| (mobile/, WIP) |   |     (api/common/)       |   |                |
+----------------+   +------+------------------+   +----------------+
                            |
              +-------------+--------------+
              |             |              |
              v             v              v
          Redis        SMTP email    Google / Gemini
        (rate limit)                  (OAuth + AI)
```

### Tech stack

| Layer          | Technology                                             |
| -------------- | ------------------------------------------------------ |
| Backend API    | Go 1.25, Gin, MongoDB, JWT, Redis                      |
| Web            | Next.js, React, TypeScript                             |
| Mobile         | Flutter (planned)                                      |
| AI             | Google Gemini, Groq (summaries & categorization)       |
| Infrastructure | Docker, Helm, Terraform                                |

## Repository structure

```
expendit/
├── api/
│   └── common/          # Go backend API (Gin, MongoDB) — module: expendit-server
├── web/                 # Next.js web application (marketing + dashboard)
├── mobile/
│   ├── flutter/         # Flutter cross-platform app (planned)
│   ├── android/         # Native Android (planned)
│   └── ios/             # Native iOS (planned)
├── deploy/
│   ├── docker/          # Container / Docker Compose configuration
│   ├── helm/            # Kubernetes Helm charts
│   └── terraform/       # Infrastructure as Code
├── docs/                # Architecture, setup, and reference documentation
├── scripts/             # Developer and CI scripts
└── (root config)        # README, LICENSE, Makefile, .editorconfig, etc.
```

> Backend services live under `api/`. The current backend is `api/common`;
> additional services would be added as `api/<function>` (named by role, never by
> language).

## Getting started

### Prerequisites

- [Git](https://git-scm.com)
- [Go](https://go.dev/) 1.25+ (for the API)
- [Node.js](https://nodejs.org/) 20+ (for the web app)
- [MongoDB](https://www.mongodb.com/) and [Redis](https://redis.io/) (locally or via Docker)
- [Docker](https://www.docker.com/) & Docker Compose (optional, for containers)

### Quick start

```bash
# 1. Clone the repository
git clone https://github.com/cuesoftinc/expendit.git
cd expendit

# 2. Install workspace dependencies
make install

# 3. Configure environment variables
cp api/common/.env.example api/common/.env   # fill in your values
cp web/.env.example web/.env.local           # fill in your values

# 4. Start the API and web app in development
make dev
```

The API listens on `http://localhost:9000` and the web app on
`http://localhost:3000` by default.

Run `make help` to see all available targets. For a detailed walkthrough, see
[docs/setup.md](./docs/setup.md).

## Documentation

Full documentation lives in the [`docs/`](./docs) folder:

- [Project overview](./docs/overview.md) — architecture and components
- [Local setup guide](./docs/setup.md) — step-by-step development environment

Service-specific notes live in each workspace: [`api/common/README.md`](./api/common/README.md)
and [`web/README.md`](./web/README.md).

## Contributing

We welcome contributions of all kinds — bug fixes, features, documentation, and
more. Please read the [Contribution Guide](./CONTRIBUTING.md) before opening a PR,
and note our [Code of Conduct](./CODE_OF_CONDUCT.md).

For first-time contributors, look for issues labelled
[`good first issue`](https://github.com/cuesoftinc/expendit/labels/good%20first%20issue).

## Security

Please report security vulnerabilities responsibly. See our
[Security Policy](./SECURITY.md) for how to report an issue privately.

## License

Expendit is open-source software licensed under the [MIT License](./LICENSE).

## Community

- [GitHub Discussions](https://github.com/cuesoftinc/expendit/discussions)
- [Report a bug](https://github.com/cuesoftinc/expendit/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/cuesoftinc/expendit/issues/new?template=feature_request.md)
