# Changelog

All notable changes to Expendit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Weekly Dependabot coverage for GitHub Actions, service Dockerfiles, and root Docker Compose images (#534).
- `gitbook-docs.yaml` for GitBook's site-wide Git Sync, and `web/.gitignore` ignores the `AGENTS.md` that `next dev` writes (#528).
- `POST /internal/jobs/<name>` on api/common, guarded by scheduler OIDC token.
- Rate limiter keys carry the `REDIS_KEY_PREFIX` product prefix.
- Staging estate documented: Cloud Run, Cloud Scheduler, managed Kafka and the `stg` secrets config.
- **Release workflow and deploy runbook.** `.github/workflows/release.yml`
  builds the three API images on every merge to main and points the Cloud Run
  services at the new digests via WIF in the `Sandbox`
  environment, failing unless every revision is Ready.
  `docs/deploy-runbook.md` is the operator's checklist for GCP, Firebase
  Auth, managed Postgres, Kafka (topics and ACLs) and Redis, IAM and the
  website switch-over.
- **The ratified system design, built (S-1…S-14, 2026-10-05).** Three
  services on one base layout: `api/common` (Go, the only Postgres client,
  with row-level security, Firebase auth, upload tickets, a transactional
  outbox and sweeps), `api/statements` (Node, a stateless ticketed upload
  gateway) and `api/analytics` (Python, every decision, in extract and
  compute worker pools). JSON Schemas for all eight Kafka topics live in
  `api/common/contract/` and are validated by every service. The compute
  pool now runs statement validation, the 22 ratio metrics and PIT/CIT/VAT
  (including the legacy regimes) from rule sets delivered as data.
  docs/system-design.md, docs/decisions.md.

- Datadog service catalog entry for the Expendit system.
- Mock reset endpoint `POST /api/mock/v1/testing/reset` (reseeds the
  in-memory store to seed state), matching the sibling repos' e2e
  test-harness convention (#268).
- Web app manifest at `/manifest.webmanifest`: product identity, token
  colors and the brand icons; the SEO spec now locks it (#262).
- Settings goes route-backed tabs: Organization | Members | Data & privacy |
  Notifications, each deep-linkable (#240).
- Categories gains an Archive tab: routed Active | Archive registry views
  (#245).
- Self-host install snippet goes tabbed: Docker Compose and Helm (#239).
- Real date pickers: `DatePicker`/`MonthPicker` grids, and `PeriodPicker` goes
  pick-or-type (#235).
- SEO plumbing: sitemap, `robots.txt`, canonical URLs, and a 1200×630 Open
  Graph card (#253).

- Full web implementation: the dashboard application (expense/income tracking,
  reports, bank statement import and mapping review, categories, settings)
  rebuilt from the shared component registry over a mock CRUD API, and the
  marketing home page rebuilt to match, backed by a realistic seven-month
  seeded ledger.
- Interactive Scalar API reference at `/docs/api`, rendered live from the
  repository's OpenAPI spec.
- Tri-state theme control (light / dark / system).

- Production service bootstrap: `/health` + `/ready`, structured `slog` logging,
  `RequestID`/`Logger`/`Recovery`/CORS middleware, and graceful shutdown.
- Local Docker stack: root `docker-compose.yml` (mongo, redis, api-common:8080,
  web:3000), compose-driven `Makefile`, and `.env.example`.
- Standardized repository structure and shared CueLABS™ community-health files
  (SECURITY, CODE_OF_CONDUCT, CONTRIBUTING, CODEOWNERS, PR/issue templates), a
  scoped Dependabot config, `deploy/{docker,helm,terraform}`, and
  `docs/overview.md` + `docs/setup.md`.
- Optional `envFrom` secret hook in the Helm deployment template so real
  deployments can inject `JWT_SECRET`/SMTP credentials from Kubernetes Secrets.

- `.cuelabs/project.yaml` — the CueLABS project manifest (standards