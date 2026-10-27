# Expendit — API Surface

> **Rewritten 2026-10-05** from the ratified [system design](system-design.md)
> §7 and verified against `api/common/internal/router/router.go` and
> `api/statements/src/upload/`. The web mock (`web/src/app/api/mock/v1`) is
> the contract; the backend implements it. Markers: **[Built]**, **[Planned]**.

## 1. Hosts and protocol **[Built]**

| Host | Routes to |
| --- | --- |
| `expendit.cuesoft.io` | web |
| `api.expendit.cuesoft.io/api/v1/uploads` | `api/statements` (upload gateway, S-14) |
| `api.expendit.cuesoft.io` (every other path) | `api/common` |

HTTP/JSON only (X-8). There are no service-to-service HTTP calls: the
services talk over Kafka (system-design.md §5.3).

## 2. Conventions **[Built]**

- Versioned under `/api/v1`. `GET /health` and `GET /ready` sit at the root.
- **Auth**: `Authorization: Bearer <Firebase ID token>`, Google only (X-1).
  The first sign-in creates the personal org.
- **Org context**: the `X-Org-Id` header. Without it, the personal org is
  used. Another org's id answers `404 not_found`, never `403`
  (engineering.md §2).
- **Errors**: `{"error": {"code", "message", "details"}}`; codes per
  engineering.md §1 and the flow docs. `429` responses carry `Retry-After`.
- **Pagination**: `{items, next_cursor}` with an opaque cursor.
- **Idempotency**: `Idempotency-Key` on `POST /import` and `POST /statements`.
  The same key returns the same job while it is live; a failed job
  releases its key.
- **CORS**: exact allowlist (`CORS_ORIGINS`), no credentials. Allowed
  headers: `Authorization, Content-Type, Idempotency-Key, X-Org-Id`
  (common) and `Content-Type, Upload-Ticket` (statements).

## 3. api/common **[Built]**

| Area | Method & path | Notes |
| --- | --- | --- |
| Identity | `GET /me` | user, current org and role, the user's orgs |
| | `GET /orgs` · `POST /orgs` | create makes a **company** org; personal orgs come from sign-in |
| | `PATCH /orgs/{id}` | name, `fiscal_year_end`, `registered_address`; owner only |
| | `GET /orgs/{id}/members` · `POST /orgs/{id}/members` | invite by email: active if the user exists, else pending until that email's first sign-in |
| | `PATCH /orgs/{id}/members/{userId}` · `DELETE …` | role change or removal; at least one owner always remains |
| | `GET /consent` · `POST /consent` | `tos`, `privacy`, `ai_processing` (self) |
| Ledger | `GET /categories[?archived=1]` · `POST /categories` | list includes `txn_count_ytd` |
| | `GET,PUT,DELETE /categories/{id}` | delete refuses a category in use (`409 category_in_use`) |
| | `POST /categories/{id}/merge {into}` · `…/archive` · `…/unarchive` | merge moves ledger and staged rows |
| | `GET /transactions` | filters: `date_from, date_to, category_id, source, direction, amount_min, amount_max, anomaly_only, search, cursor, limit` |
| | `POST /transactions` · `GET,PUT,DELETE /transactions/{id}` | `PUT` may only clear `anomalies` (`[]`) |
| | `GET /report/monthly` · `GET /report/category?month=` | plain sums; runway comes from the stored ratio report |
| Imports | `POST /import {file_name, size, file_type?}` | `file_type` defaults to what the name implies; authorizes and returns `201 {job_id, upload_ticket, expires_at, max_bytes}`. `403 consent_required` (images without AI consent), `413 file_too_large`, `415 unsupported_type`, `429 rate_limited` / `quota_exceeded` |
| | `GET /import` · `GET /import/{jobId}` | job + staged rows; poll while `processing` |
| | `PUT /import/transactions/{id}/category` · `…/include` | correct a category (clears ✨); re-include a flagged duplicate |
| | `POST /import/{jobId}/confirm` | atomic; a second call is a 200 no-op |
| | `DELETE /import/{jobId}` | discard: job, staging and the raw file |
| Statements | `POST /statements` | upload `{kind, period, file_name, size, file_type?}` → `201 {statement_id, upload_ticket}`; or manual `{kind, period, currency, line_items[]}` → `201` staged |
| | `GET /statements` · `GET /statements/{id}` · `GET /statements/{id}/mapping` | statement + line items |
| | `PATCH /statements/{id}/mapping` | `{updates[], additions[], currency?}`; bumps `mapping_version` and requests revalidation |
| | `POST /statements/{id}/confirm` | checks the stored validation: `409 validation_pending`, `422 mapping_identity_violation`, `422 unmapped_threshold_exceeded` (S-8) |
| Computed | `GET /ratios?period=` · `POST /ratios/compute {period}` | stored report + `status: current \| recomputing` (§16 I-9) |
| | `GET /tax/profile` · `PUT /tax/profile` | treatments, identity fields, `annual_rent`, `deductions` |
| | `GET /tax/estimates` | stored estimates with traces, authority and `ruleset_id`, plus `status` |

## 4. api/statements **[Built]**

```
POST /api/v1/uploads
Upload-Ticket: v1.<claims>.<signature>
multipart/form-data, one part named "file"

202 {"id": "<job or statement id>", "kind": "import_job" | "fin_statement", "status": "processing"}
```

`401 invalid_ticket` / `ticket_expired`, `413 file_too_large`,
`415 unsupported_type` (magic bytes don't match the declared type), and
`503` when storage or Kafka is down. Ticket format:
`api/common/contract/upload-ticket.md`.

## 5. Planned surface **[Planned]**

| Group | Endpoints | Phase |
| --- | --- | --- |
| Bank links | `POST /bank-links` (widget config) · `PUT /bank-links/{id}/exchange {code}` · `GET /bank-links` · `POST /bank-links/{id}/sync` · `PATCH /bank-links/{id}` (pause, auto-confirm) · `DELETE /bank-links/{id}?purge=bool` · `POST /webhooks/mono` (signature-verified, stored raw first) | C |
| Ratio trace | `GET /ratios/{key}/trace?period=` | D |
| Tax filings | `GET /tax/filings` · `POST /tax/filings` (draft) · `POST /tax/filings/{id}/generate` (`409 ruleset_unsigned`, `422 tax_identity_incomplete`, `422 period_incomplete`) | E |
| Reports | `POST /reports {kind, period, format, category?, statement_kind?}` → `201 {artifact_id, signed_url, expires_at}` (30-day TTL) · `GET /reports` · `GET /reports/{id}/download` | EXP-004 |
| Data rights | `POST /account/export` → `202 {job_id}` · `GET /account/export/{jobId}` (7-day signed URL) · `POST /account/purge` · `GET /account/purge` · `DELETE /account/purge` (7-day grace) | USR-001/002 |

**Events (ECO-ANALYTICS):** `upload_success`, `import_confirmed`,
`import_discarded`, `report_generation` go to Upstat as counters with coarse
dimensions (file_type, kind) only. Never amounts, descriptions or
categories.

## 6. Gap analysis

| Requirement | Built | Gap |
| --- | --- | --- |
| EXP-001 preview landing | landing | demo-data preview section (web) |
| EXP-002 uploads | CSV/XLSX/PDF/receipt images; tickets; typed failures; 15 MB | PDF/image **statements** need AI table extraction |
| EXP-003 AI categorization | keyword + AI categories, correction, §7 anomaly rules | anomaly UX outside import |
| EXP-004 downloadable summaries | JSON aggregates | `POST /reports` + rendering |
| EXP-005 privacy hub | — | web page + D3 clause, updated for S-4 |
| USR-001 / USR-002 | per-item deletes | `account/export`, `account/purge` |
| ECO-AUTH | Firebase ID tokens | `account.cuesoft.io` facade (D1) |
| ECO-ANALYTICS | — | D2 + server-side events |
