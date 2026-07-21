# Changelog

All notable changes to Expendit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Dashboard rail prefetch is intent-based: a pillar's chunks load on the
  first hover/focus of its nav item instead of on viewport entry, so a cold
  dashboard route ships only its own chunk set (~204K vs ~355K settled JS
  on accounts) with navigation latency unchanged (#262).
- The skip link converges on the fleet-canonical construction
  ("Skip to content") (#262).
- Mock-data module renamed `src/mock/` → `src/mocks/` for tree-shape parity
  with the sibling repos (#256).
- `/docs/api`'s Scalar reference now loads on user intent instead of shipping
  eagerly with the route; a dashboard bundle audit found every route's
  shared weight is the framework + prefetch floor, with nothing safe to cut
  (#257).

### Fixed
- Ratio gauges format the period delta (2dp ratio convention, or the
  metric's own style — days stay integer) instead of printing the raw
  float (#262).
- Accessibility closeout: valid tab IDREFs in code snippets, date-picker
  popover focus containment, named table headers, a skip-to-content link,
  distinct nav landmark labels, and deferred below-the-fold demo panels
  cutting home mobile blocking time; overview layout shift drops to ~0
  (#260).
- Contrast-token canon: AA-compliant `-text` variants for the tinted-chip
  recipe so tinted text clears 4.5:1 in both themes (#254).
- Signin's legal links now point at the canonical Cuesoft policies, and the
  onboarding AI-consent sheet's "privacy hub" mention is now a real link
  (#258).

### Added
- Web app manifest at `/manifest.webmanifest`: product identity, token
  colors and the brand icons; the fleet SEO spec now locks it (#262).
- Settings goes route-backed tabs: Organization | Members | Data & privacy |
  Notifications, each deep-linkable (#240).
- Categories gains an Archive tab: routed Active | Archive registry views
  (#245).
- Self-host install snippet goes tabbed: Docker Compose and Helm (#239).
- Real date pickers: `DatePicker`/`MonthPicker` grids, and `PeriodPicker` goes
  pick-or-type (#235).
- SEO plumbing: sitemap, `robots.txt`, canonical URLs, and a 1200×630 Open
  Graph card (#253).

### Changed
- Chart fidelity: `Chart`/`Line` y-axis tick labels and gridlines now match
  the Figma master; the cash-flow line no longer renders dashed under fill
  mode; the fill-mode plot no longer slides under the y-axis labels (#228,
  #229, #243, #244).
- Destructive actions (row delete, ledger closeout) now use the quiet-danger
  button styling instead of a loud red (#246, #250).
- Dead-code and env-plumbing cleanup: removed dead symbols, an orphaned
  asset/fixture, an unused popover dependency, and the dead
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID`/`NEXT_PUBLIC_BASE_URL` env plumbing; piped
  Playwright's `webServer` output so CI server deaths are diagnosable (#247,
  #248, #249).

### Fixed
- Figma↔code convergence pass: settings uniques, Wordmark parity, full-ledger
  explain comparables, `Select` `aria-label` wiring, how-it-works thumbnail
  sizing, landing typography, and the `DatePicker` popover placement/
  modal-safe merge `Select`/mid-band balance (#230, #232, #233, #238, #241,
  #242).
- Accessibility: checkboxes now carry accessible names (axe critical errors
  ×60 → 0) and overlays restore focus to their trigger on close (#252).

### Added
- Full web implementation: the dashboard application (expense/income tracking,
  reports, bank statement import and mapping review, categories, settings)
  rebuilt from the shared component registry over a mock CRUD API, and the
  marketing home page rebuilt to match, backed by a realistic seven-month
  seeded ledger.
- Interactive Scalar API reference at `/docs/api`, rendered live from the
  repository's OpenAPI spec.
- Tri-state theme control (light / dark / system).

### Changed
- Mobile-responsive pass: no document-level side-scroll at 390px on the home
  page or any dashboard route; wide data surfaces (ledger, staged review,
  statement grid, mapping review) now scroll within their own containers.
- Cash-flow and report charts start at ledger onset instead of zero-filling
  months before an organization's first transaction; fiscal-year trend
  markers are discrete.
- Dependency and tooling cleanup: retired the MUI/Emotion UI kit, Axios, and
  other dead runtime dependencies; migrated to `date-fns`; retired Jest in
  favor of co-located Vitest; adopted Tailwind v4 and a typed Next.js config;
  cross-repo tooling parity (shared boundary gate, canonical lint/format/test
  configs) with the other CueLABS™ repositories.

### Removed
- The legacy MUI-era dashboard and marketing app, and the redirect stubs for
  its old routes (which now 404).

### Fixed
- An unset theme preference now boots the design default instead of forcing
  a theme choice; the `/docs/api` header now coexists cleanly with the rest
  of the app shell.
- Floating-layer viewport collision clamping; demo-realism and usability QA
  passes across the app.

### Added
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

### Changed
- Canonical Go module path `github.com/cuesoftinc/expendit/api/common`; SMTP_*
  env vars upper-cased; web components renamed to PascalCase files with
  kebab-case routes (`/forgot-password`); eslint flat config; jest wired with
  passing tests; standard-form Helm chart + cluster-agnostic terraform;
  per-service internals standardized.
- Migrated `api/common` to `cmd/server` + `internal/` with singular
  purpose-based packages and `snake_case.go` files.
- Standardized web naming (kebab-case folders + modules, PascalCase components);
  moved `src/API/APIS` → `src/api`.
- Aligned README + docs (overview, setup) to the shared CueLABS™ section
  structure; run commands use `make up` / `go run ./cmd/server`.
- Rewrote README/CONTRIBUTING to match the real stack (Go + Gin + MongoDB,
  Next.js); aligned `.gitignore`, `.editorconfig`, and `.dockerignore` to the
  shared standard.
- Fixed the Makefile to use Go tooling (it previously invoked npm against the Go
  service) and corrected CODEOWNERS.
- Helm values now document the external MongoDB/Redis requirement (the chart
  does not deploy databases); `web/.gitignore` + `web/.env.example` aligned to
  the shared standard; `income.go` renamed to `income_model.go`.

### Removed
- Dead gRPC surface (unwired Go proto/interceptor and the web grpc-methods/
  proto chain whose deps were never installed), dead util/model files, stale
  api Makefile, orphan template/marketing assets, debug console/print logging.
- Dead `configs` package, a broken gRPC `main_test.go`, and stray
  `k8s/deployment.yaml` manifests.
- GitHub Actions CI workflow and a committed `api/common/main.exe` build artifact.
- Dead `GenerateUniqueToken` util (and its `randstr` dependency), the leftover
  `X-UserID` CORS allow-header, and commented-out gRPC remnants in the web
  sign-in/sign-up hooks.

### Fixed
- Change-password verified against the wrong argument order (always failed);
  reset-password email linked a 404 path; request-path `log.Fatal`/`log.Panic`
  could kill the server; JWT/SMTP env read at call time (empty-key signing).
- Malformed `validate` struct tags on the expense/income category models meant
  those validations were silently skipped; the forgot-password form stayed stuck
  in a loading state after early validation errors; per-request contexts leaked
  in several user handlers (`defer cancel()` is now immediate); stale
  `expendit-server` module references in README/docs.

### Security
- Removed the `X-UserID` header-trust middleware (IDOR) — identity comes only
  from the JWT `uid` claim; `UpdateUser` no longer accepts `user_type` from the
  request body (self privilege-escalation); expense reads now require auth.
- Migrated auth from the abandoned `dgrijalva/jwt-go` to `golang-jwt/jwt/v4` and
  added JWT signing-method validation.
- Bumped `golang.org/x/crypto` (critical advisories) and `excelize`; applied
  non-breaking npm fixes and pinned `postcss`.
- Password reset tokens are no longer written to server logs; `password` and
  `refresh_token` are excluded from all JSON API responses; `util.ParseToken`
  rejects non-HMAC signing methods.
