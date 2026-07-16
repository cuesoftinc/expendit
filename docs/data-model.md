# Expendit — Data Model

> Companion to [prd.md](prd.md) / [architecture.md](architecture.md).
> Markers: **[Current]**, **[PRD]**, **[Proposed]**.

> **X-5 alignment (2026-07-16):** cloud system of record is **Aiven
> Postgres**; the Mongo entities below describe the *current* code and the
> self-host default until the Mongo→Postgres migration executes with E-4.
> Entity shapes are store-agnostic.

## 1. Current entities **[Current]** (MongoDB)

```mermaid
erDiagram
    USER ||--o{ EXPENSE : owns
    USER ||--o{ INCOME : owns
    USER ||--o{ CATEGORY : owns
    USER ||--o{ IMPORT_JOB : runs
    IMPORT_JOB ||--o{ IMPORTED_TRANSACTION : stages

    USER {
        objectid _id PK
        string user_id
        string first_name
        string last_name
        string email
        string password "bcrypt; json:- (never serialized)"
        string user_type "ADMIN | USER"
        string refresh_token "json:-"
        datetime created_at
    }
    EXPENSE {
        objectid _id PK
        string userid
        string name
        float amount
        string category
        datetime date
    }
    INCOME {
        objectid _id PK
        string userid
        string name
        float amount
        string category
        datetime date
    }
    CATEGORY {
        objectid _id PK
        string userid
        string name
        string type "expense | income"
    }
    IMPORT_JOB {
        objectid _id PK
        string userid
        string status "processing | completed | failed"
        string file_name
        string file_type "csv | pdf | image"
        int total_parsed
        int duplicates_found
        int imported
        json summary "totals, net, by_category, monthly_trends"
        string ai_summary "LLM narrative"
        json anomalies "typed list"
        datetime created_at
        datetime completed_at
    }
    IMPORTED_TRANSACTION {
        objectid _id PK
        objectid job_id FK
        string userid
        string description
        float amount
        string direction "income | expense"
        string category "AI-assigned, user-correctable"
        bool is_duplicate
        datetime txn_date
    }
```

Notes:

- Field names above are representative of the Go structs in
  `internal/model/`; `password`/`refresh_token` are excluded from all JSON
  responses (`json:"-"`).
- Anomaly vocabulary **[Current]**: `large_transaction`, `spending_spike`,
  `abnormal_category`, `duplicate_charge`.
- Raw uploaded file bytes are **not persisted** — parsed in-memory only.
  This is a privacy feature to keep, and to document (prd.md §8.3).

## 2. Target additions **[Proposed]**

```mermaid
erDiagram
    USER ||--o{ REPORT_ARTIFACT : downloads
    USER ||--o| PURGE_REQUEST : "may file"
    USER ||--o{ CONSENT_RECORD : signs

    REPORT_ARTIFACT {
        objectid _id PK
        string userid
        string kind "monthly_summary | cash_movement | full_export"
        string format "pdf | csv | json"
        string period "e.g. 2026-06"
        string object_key "or streamed; TTL"
        datetime created_at
    }
    PURGE_REQUEST {
        objectid _id PK
        string userid
        string status "pending | cancelled | executed"
        datetime requested_at
        datetime effective_at "end of grace window"
    }
    CONSENT_RECORD {
        objectid _id PK
        string userid
        string document "tos | privacy | ai_processing"
        string version
        datetime accepted_at
    }
```

- `REPORT_ARTIFACT` backs EXP-004 (downloadables) and USR-001 (full export is
  just `kind: full_export`).
- `PURGE_REQUEST` backs USR-002 with a grace window (architecture.md §5.3).
- `CONSENT_RECORD` mirrors apparule's model for ecosystem parity; the
  `ai_processing` document records acceptance of third-party AI extraction
  (prd.md §6, open question 1).

## 3. Identity mapping for D1 (account.cuesoft.io) **[Proposed]**

When the central account service lands, `USER` gains a nullable
`account_subject` column; login via D1 links-or-creates the local user row.
Local credentials remain valid through a deprecation window, then password
fields are dropped. This keeps every owned collection (`userid` scoping)
untouched during migration.

## 4. Data classification & handling **[PRD §5/§7]**

| Class | Data | Rules |
| --- | --- | --- |
| High-sensitivity | Transactions (all), import staging, summaries, AI narratives, uploaded file bytes (in flight) | Never in logs (the current `[pdf] sample:` log line must go — architecture.md §4.2); TLS in transit; third-party AI processing disclosed; raw files not at rest |
| Sensitive | User identity, consent, purge requests | Standard PII handling; consent/purge rows immutable audit records |
| Operational | Job status/counters, event counters to Upstat | Safe for logs/metrics; Upstat events are **counters only, never amounts or descriptions** |

Retention defaults **[Proposed, to ratify]**: ledger data until user deletion
(USR-002); import jobs + staging 90 days after confirm/discard; report
artifacts 30 days (regenerable); raw uploads never at rest.

---

## 5. Expansion entities (2026-07-16) **[Proposed]**

```mermaid
erDiagram
    USER ||--o{ ORG_MEMBER : "belongs to"
    ORG ||--o{ ORG_MEMBER : has
    ORG ||--o{ BANK_LINK : links
    BANK_LINK ||--o{ BANK_SYNC : "runs"
    ORG ||--o{ FIN_STATEMENT : uploads
    FIN_STATEMENT ||--o{ LINE_ITEM : "normalized into"
    ORG ||--o{ RATIO_REPORT : computes
    ORG ||--o{ TAX_PROFILE : configures
    TAX_PROFILE ||--o{ TAX_ESTIMATE : produces
    TAX_PROFILE ||--o{ TAX_FILING : files

    ORG { objectid _id PK
        string name
        string kind "personal | company"
        string currency
        string country }
    BANK_LINK { objectid _id PK
        objectid org_id FK
        string provider "mono|okra|plaid — to ratify"
        string institution
        string masked_account
        string status "active|reauth_required|paused"
        datetime last_synced_at }
    FIN_STATEMENT { objectid _id PK
        objectid org_id FK
        string kind "balance_sheet|income_statement|cash_flow"
        string period "e.g. 2026-Q2 / FY2025"
        string source_file_type
        string mapping_status "staged|confirmed" }
    LINE_ITEM { objectid _id PK
        objectid statement_id FK
        string canonical_key "current_assets|inventory|total_debt|revenue|cogs|net_income|..."
        string source_label "as it appeared in the upload"
        float amount }
    RATIO_REPORT { objectid _id PK
        objectid org_id FK
        string period
        json ratios "key → {value, formula, inputs[line_item ids], benchmark_band}"
        datetime computed_at }
    TAX_FILING { objectid _id PK
        objectid org_id FK
        string kind "pit|cit|vat"
        string period
        string status "draft|generated|submitted|accepted"
        json computed_fields "each with input trace"
        string artifact_key "generated forms"
        datetime filed_at }
```

Notes: existing per-user collections become org-scoped (`org_id`) with a
personal org auto-created per user (migration: `userid` → personal org). The
`canonical_key` vocabulary is the closed mapping target for AI-suggested
line mapping (pages.md B6) — same schema-as-boundary pattern as elsewhere.
Ratio formulas persist **with their inputs** so every gauge is auditable
(MI-8 trace). Tax computed fields carry input traces for the wizard's
"how we got this" expanders; filings are immutable once submitted.
Bank credentials are never stored — only provider tokens, encrypted, with
provider-side revocation honored (BNK-002 unlink offers keep-or-purge for
already-imported transactions).
