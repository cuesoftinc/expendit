# Expendit — API Surface

> Current surface verified against `internal/router/*.go`. Markers: **[Current]**,
> **[PRD]**, **[Proposed]**.

## 1. Current surface **[Current]** (api/common, :8080)

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
| `POST /api/v1/reports` | `{kind: monthly_summary\|cash_movement, period, format: pdf\|csv}` → artifact (stream or signed URL) |
| `GET /api/v1/reports` | past artifacts (TTL'd) |
| `POST /api/v1/account/export` | full-history export (`full_export`, CSV/JSON archive) — USR-001 |
| `POST /api/v1/account/purge` | request full deletion (grace window) — USR-002 |
| `DELETE /api/v1/account/purge` | cancel within grace |
| `GET /api/v1/consent` · `POST /api/v1/consent` | ToS/privacy/AI-processing acceptance records |

### Import hardening

| Change | Why |
| --- | --- |
| `POST /import/upload` → `202 {job_id}`; processing moves to a worker | Synchronous AI budget (≤120 s) inside the request doesn't scale (architecture.md §4.2) |
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
| Orgs | `POST /orgs` · `GET /orgs` · member CRUD (`role: owner|admin|member`) · org-scoped auth context header |
| Bank links | `POST /bank-links` (provider session init) · provider webhook `/webhooks/bank` · `GET /bank-links` · `POST /bank-links/{id}/sync` · `PATCH` (pause/auto-confirm) · `DELETE ?purge=bool` |
| Company statements | `POST /statements` (upload) · `GET /statements/{id}/mapping` (staged line items) · `PATCH /statements/{id}/mapping` (fix canonical keys) · `POST /statements/{id}/confirm` |
| Ratios | `POST /ratios/compute {period}` · `GET /ratios?period` · `GET /ratios/{key}/trace` |
| Taxes | `GET /tax/profile` · `PUT /tax/profile` · `GET /tax/estimates` · `POST /tax/filings` (wizard draft) · `POST /tax/filings/{id}/generate` · `POST /tax/filings/{id}/submit` (v2, provider-gated) · `GET /tax/filings` |

Bank-synced transactions enter the existing import pipeline as jobs
(`source: bank_sync`) — one staged-review path for every ingress. Statement
mapping mirrors import review (staged → human confirm) with the
`canonical_key` closed vocabulary.
