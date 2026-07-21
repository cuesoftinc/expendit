# Expendit — API Surface

> Current surface verified against `internal/router/*.go`. Markers: **[Current]**,
> **[PRD]**, **[Proposed]**.

## 1. Current surface **[Current]** (api/common, :8080)

`GET /health` + `GET /ready` — probes (unauthenticated).

All routes JSON unless noted; protected routes require `Authorization: Bearer <JWT>`
and scope data to the token's `uid` claim.

### Auth & users

| Method & path | Auth | Notes |
| --- | --- | --- |
| `POST /users/signup`, `POST /signup` | public | duplicate registration paths (legacy alias) — consolidate at v1 **[Proposed]** |
| `POST /users/signin`, `POST /login` | public, rate-limited | issues JWT |
| `POST /auth/google` | public | Google sign-in |
| `POST /users/forgot-password` | public, rate-limited | reset email |
| `PATCH /users/reset-password` | public, rate-limited | token-based reset |
| `POST /logout` | protected | |
| `GET /users` | protected (admin) | password/refresh-token never serialized |
| `GET /users/:user_id` | protected | |
| `PUT /users/change-password` | protected | identity from JWT |
| `PUT /users/:id` | protected | cannot change `user_type` |

### Ledger

| Group | Routes |
| --- | --- |
| `/expense` (protected) | `GET ""`, `GET /:id`, `GET /search`, `GET /user/:userID`, `POST /create`, `PUT /:id`, `DELETE /:id`, `GET /expenses/month/:userID`, `GET /month-expense/:userID` |
| `/income` (protected) | `GET ""`, `GET /:id`, `GET /search`, `POST /create`, `PUT /:id`, `DELETE /:id`, `GET /incomes/monthly/:userID`, `GET /incomes/month/:userID` |
| `/category` (protected) | `GET ""`, `GET /:id`, `GET /search`, `POST /create`, `PUT /:id`, `DELETE /:id` |

(Path `:userID` segments are legacy — handlers enforce the JWT `uid`; v1
removes them from paths. **[Proposed]**)

### Import (EXP-002/003 core)

| Method & path | Purpose |
| --- | --- |
| `POST /import/upload` | multipart file (CSV/tabular, PDF, receipt image) → creates job, parses, stages, categorizes, detects duplicates/anomalies, summarizes (synchronous today) |
| `GET /import/:jobId` | job + staged transactions |
| `PUT /import/transaction/:id/category` | user correction |
| `POST /import/:jobId/confirm` | commit staged rows to ledger |
| `DELETE /import/:jobId` | discard job + staging |

### Reports

| Method & path | Purpose |
| --- | --- |
| `GET /report/monthly/:userID` | income-vs-expense by month (bar chart data) |
| `GET /report/chart/category/:userID` | totals by category |
| `GET /report/chart/category/expenses/:userID` | expense breakdown by category |

## 2. Target surface **[Proposed]** — deltas only, under `/api/v1`

The v1 exercise is mostly *consolidation* (one signup path, JWT-scoped paths
without `:userID`, error envelope, pagination) plus these new capabilities:

### Downloadable reports (EXP-004) & data rights (USR-001/002)

| Method & path | Purpose |
| --- | --- |
| `POST /api/v1/reports` | `{kind: monthly_summary\|cash_movement\|category_deep_dive\|financial_statement, period, format: pdf\|csv, category?, statement_kind?}` (`category` required for `category_deep_dive`; `statement_kind` + statement-grammar `period` for `financial_statement` — pages.md B5/B6) → `201 {artifact_id, signed_url, expires_at}` — **signed URL from the X-5 bucket [Decided]**, 30-day artifact TTL |
| `GET /api/v1/reports` | past artifacts (TTL'd) |
| `POST /api/v1/account/export` | full-history export — USR-001: `202 {job_id}`; poll `GET /api/v1/account/export/{job_id}` → `{status, signed_url?}`; archive = ZIP of CSV per collection + manifest.json; **7-day download TTL [Decided]** |
| `POST /api/v1/account/purge` | request full deletion (grace window) — USR-002 |
| `DELETE /api/v1/account/purge` | cancel within grace |
| `GET /api/v1/consent` · `POST /api/v1/consent` | ToS/privacy/AI-processing acceptance records |

### Category registry archive (pages.md B8) **[Ratified 2026-07-21]**

| Method & path | Purpose |
| --- | --- |
| `GET /api/v1/categories?archived=1` | archived registry; the default (no param) list is active-only, so pickers, merge targets, and imports never see archived rows |
| `POST /api/v1/categories/{id}/archive` · `.../unarchive` | quiet + reversible + idempotent; `archived_at` stamps the archive date (null = active); merge refuses an archived target — `422 merge_target_archived` |

### Import hardening

| Change | Why |
| --- | --- |
| `POST /import/upload` → `202 {job_id}` (v1 path: `/api/v1/import/upload`; the unprefixed route dies at v1 — no alias) | Synchronous AI budget (≤120 s) inside the request doesn't scale (architecture.md §4.2) |
| `GET /import/:jobId` becomes the polling/streaming surface | Status field already models `processing/completed/failed` |
| Explicit upload limits (size, MIME) with typed errors | Predictable failure surface |

### Events (ECO-ANALYTICS)

Server-side emission to Upstat: `upload_success` (job completed),
`report_generation` (artifact created). Counters + coarse dimensions only
(file_type, kind) — never amounts, descriptions, or categories.

## 3. Gap analysis — requirement → current → needed

| Requirement | Current | Gap |
| --- | --- | --- |
| EXP-001 preview landing | Landing exists, no example-report section | Web-only: demo-data preview section |
| EXP-002 uploads | CSV/PDF/receipt-image implemented | Async processing, limits (hardening) |
| EXP-003 AI categorization | Engine + correction + anomalies implemented | Anomaly UX outside import; correction feedback loop |
| EXP-004 downloadable summaries | JSON aggregates only | `POST /api/v1/reports` + artifact rendering |
| EXP-005 privacy hub | Nothing | Web page + D3 clause + AI-processing disclosure |
| USR-001 export-all | Nothing | `account/export` |
| USR-002 delete-all | Per-item deletes only | `account/purge` with grace |
| ECO-AUTH | Local JWT auth (solid) | D1 integration when contract exists |
| ECO-ANALYTICS | Nothing | D2 + two server-side events |

## 4. Conventions **[Proposed]**

Shared with apparule's api.md §4 for ecosystem parity: versioned `/api/v1`,
error envelope `{"error": {"code", "message"}}`, cursor pagination,
idempotency keys on upload/purge/report creation.

---

## 5. Expansion surface (2026-07-16) **[Proposed]** — deltas, `/api/v1`

| Group | Endpoints |
| --- | --- |
| Orgs | `POST /orgs` · `GET /orgs` · `PATCH /orgs/{id}` (name, `registered_address`, `fiscal_year_end` — data-model.md §5) · members: `POST /orgs/{id}/members` (email invite → pending until that email's first sign-in), `PATCH /orgs/{id}/members/{user}` (role), `DELETE` (remove) · **org context via `X-Org-Id` header [Decided]** (absent = personal org) |
| Bank links | `POST /bank-links` (widget config) · `PUT /bank-links/{id}/exchange {code}` (token exchange, flows/bank-link.md §1) · `/webhooks/bank` (signature-verified) · `GET /bank-links` · `POST /bank-links/{id}/sync` · `PATCH` (pause/auto-confirm) · `DELETE ?purge=bool` |
| Company statements | `POST /statements` (multipart upload → `202 processing`, or JSON manual entry `{kind, period, currency, line_items[]}` → `201` staged directly — flows/statement-mapping.md §2) · `GET /statements/{id}/mapping` (staged line items) · `PATCH /statements/{id}/mapping` (fix canonical keys · add parser-missed rows) · `POST /statements/{id}/confirm` |
| Ratios | `POST /ratios/compute {period}` · `GET /ratios?period` · `GET /ratios/{key}/trace` |
| Taxes | `GET /tax/profile` · `PUT /tax/profile` (jurisdiction, treatments, `state_of_residence`, `tin`/`rc_number`/`nin` — data-model.md §5) · `GET /tax/estimates` (responses include the resolved remittance-authority block, tax-engine.md §5.5) · `POST /tax/filings` (wizard draft) · `POST /tax/filings/{id}/generate` (gated on tax identity — `422 tax_identity_incomplete`) · `POST /tax/filings/{id}/submit` (v2, provider-gated) · `GET /tax/filings` (rows carry authority + deadline) |

Bank-synced transactions enter the existing import pipeline as jobs
(`source: bank_sync`) — one staged-review path for every ingress. Statement
mapping mirrors import review (staged → human confirm) with the
`canonical_key` closed vocabulary.
