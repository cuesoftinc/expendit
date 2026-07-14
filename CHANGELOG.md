# Changelog

All notable changes to Expendit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Change-password verified against the wrong argument order (always failed);
  reset-password email linked a 404 path; request-path `log.Fatal`/`log.Panic`
  could kill the server; JWT/SMTP env read at call time (empty-key signing).

### Security
- Removed the `X-UserID` header-trust middleware (IDOR) — identity comes only
  from the JWT `uid` claim; `UpdateUser` no longer accepts `user_type` from the
  request body (self privilege-escalation); expense reads now require auth.

### Changed
- Canonical Go module path `github.com/cuesoftinc/expendit/api/common`; SMTP_*
  env vars upper-cased; web components renamed to PascalCase files with
  kebab-case routes (`/forgot-password`); eslint flat config; jest wired with
  passing tests; standard-form Helm chart + cluster-agnostic terraform;
  per-service internals standardized.

### Removed
- Dead gRPC surface (unwired Go proto/interceptor and the web grpc-methods/
  proto chain whose deps were never installed), dead util/model files, stale
  api Makefile, orphan template/marketing assets, debug console/print logging.

### Added
- Production service bootstrap: `/health` + `/ready`, structured `slog` logging,
  `RequestID`/`Logger`/`Recovery`/CORS middleware, and graceful shutdown.
- Local Docker stack: root `docker-compose.yml` (mongo, redis, api-common:8080,
  web:3000), compose-driven `Makefile`, and `.env.example`.
- Standardized repository structure and shared CueLABS community-health files
  (SECURITY, CODE_OF_CONDUCT, CONTRIBUTING, CODEOWNERS, PR/issue templates), a
  scoped Dependabot config, `deploy/{docker,helm,terraform}`, and
  `docs/overview.md` + `docs/setup.md`.

### Changed
- Migrated `api/common` to `cmd/server` + `internal/` with singular
  purpose-based packages and `snake_case.go` files.
- Standardized web naming (kebab-case folders + modules, PascalCase components);
  moved `src/API/APIS` → `src/api`.
- Aligned README + docs (overview, setup) to the shared CueLABS section
  structure; run commands use `make up` / `go run ./cmd/server`.
- Rewrote README/CONTRIBUTING to match the real stack (Go + Gin + MongoDB,
  Next.js); aligned `.gitignore`, `.editorconfig`, and `.dockerignore` to the
  shared standard.
- Fixed the Makefile to use Go tooling (it previously invoked npm against the Go
  service) and corrected CODEOWNERS.

### Removed
- Dead `configs` package, a broken gRPC `main_test.go`, and stray
  `k8s/deployment.yaml` manifests.
- GitHub Actions CI workflow and a committed `api/common/main.exe` build artifact.

### Security
- Migrated auth from the abandoned `dgrijalva/jwt-go` to `golang-jwt/jwt/v4` and
  added JWT signing-method validation.
- Bumped `golang.org/x/crypto` (critical advisories) and `excelize`; applied
  non-breaking npm fixes and pinned `postcss`.
