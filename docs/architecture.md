# Expendit — System Architecture

> Companion to [prd.md](prd.md). Markers: **[Current]**, **[PRD]**, **[Proposed]**.

## 1. Context — current state **[Current]**

```mermaid
flowchart LR
    subgraph Users
        U[Individual / SME user]
    end

    subgraph expendit.cuesoft.io
        LAND[Landing page<br/>hero, features, how-it-works]
        DASH[Dashboard suite<br/>expense, income, categories,<br/>history, import, reports, settings]
    end

    subgraph BE["Backend — api/common (Go/Gin :8080)"]
        AUTH[Auth: signup/signin/Google,<br/>reset + rate limiting]
        LEDGER[Expenses / Incomes / Categories<br/>CRUD + search + monthly aggregates]
        IMPORT[Import pipeline]
        REPORT[Report aggregations]
    end

    subgraph Data & providers
        MG[(MongoDB)]
        RD[(Redis<br/>rate-limit counters)]
        AI[Groq → Gemini<br/>extraction, categorization, narrative]
    end

    U --> LAND
    U --> DASH
    DASH -->|JWT bearer| AUTH
    DASH --> LEDGER
    DASH --> IMPORT
    DASH --> REPORT
    AUTH --> MG
    AUTH --> RD
    LEDGER --> MG
    IMPORT --> MG
    IMPORT --> AI
    REPORT --> MG
```

The intelligence core is already here; what the PRD adds is drawn in §2.

## 2. Context — target additions **[PRD + Proposed]**

```mermaid
flowchart LR
    subgraph New surfaces
        PREV[Example-report preview<br/>on landing, demo data only]
        PRIV[Privacy hub page]
        EXPORTS[Downloadable reports<br/>PDF / CSV]
        RIGHTS[Export-all / delete-all<br/>account data rights]
    end

    subgraph ECO["Ecosystem — external"]
        ACC[account.cuesoft.io]
        UP[Upstat events]
        CL[clients.cuesoft.io]
        PH[privacy.cuesoft.io]
    end

    PREV --- PRIV
    EXPORTS --- RIGHTS
    PRIV -->|clause link| PH
    RIGHTS -->|USR-001/002| API[api/common]
    EXPORTS --> API
    API -->|Upload Success,<br/>Report Generation| UP
    API -->|verify sessions when D1 lands| ACC
    DASHX[Dashboard] -.->|support| CL
```

## 3. Service breakdown

### 3.1 api/common — the whole backend **[Current]**

| Area | Packages / files | Behaviour |
| --- | --- | --- |
| Auth | `handler/user_controller.go`, `middleware/{auth,rate_limit}` | JWT (HS256, signing-method-guarded), login + password-flow rate limits, Google auth, logout, change/forgot/reset password |
| Ledger | `handler/{expense,income,category}_controller.go` | Per-user CRUD + search; monthly aggregates (`/expense/expenses/month/:userID`, `/income/incomes/monthly/:userID`, …); identity enforced from JWT `uid` (not path params) |
| Import | `service/{import_service,csv_parser,pdf_parser,ai_enhancer,categorization_engine,duplicate_detector,anomaly_engine,summary_generator}.go` | See §4 |
| Reports | `handler/report_controller.go` | Mongo aggregations: monthly income-vs-expense (bar), by-category, category-expenses |

### 3.2 web — Next.js dashboard + landing **[Current]**

Routes: `/` (marketing sections), `/signin`, `/signup`, `/forgot-password[/new-password]`,
`/dashboard`, `/expense`, `/income`, `/categories`, `/history`, `/import`,
`/reports`, `/settings`, `/change-password`. Target adds: landing preview
section (EXP-001), `/privacy` (EXP-005), report-download UI (EXP-004),
data-rights controls in `/settings` (USR-001/002). **[Proposed placement]**

## 4. The import pipeline (core asset) **[Current]**

### 4.1 Flow

```mermaid
flowchart TD
    UP[POST /import/upload<br/>multipart file] --> DET{detectFileType<br/>extension + magic bytes}
    DET -->|csv / xlsx / txt| CSV[ParseCSV — tabular parser]
    DET -->|pdf| PDFT[ExtractPDFText]
    PDFT -->|text ok| AIX[AI extraction, chunked<br/>120s budget]
    AIX -->|0 rows| RGX[Regex PDF fallback parser]
    DET -->|jpg png webp heic| VIS[AI vision extraction<br/>requires GROQ/GEMINI key]
    CSV --> STAGE
    AIX --> STAGE
    RGX --> STAGE
    VIS --> STAGE
    STAGE[Staged ImportedTransactions] --> DUP[Duplicate detector]
    DUP --> CAT[Categorization engine<br/>+ AI enhancer]
    CAT --> ANOM[Anomaly engine<br/>large txn, spike, abnormal category, duplicate charge]
    ANOM --> SUM[Summary generator<br/>totals, net cash flow, by-category,<br/>monthly trends + AI narrative]
    SUM --> JOB[(ImportJob: processing→completed/failed)]
    JOB --> REVIEW[User review:<br/>correct categories per txn]
    REVIEW --> CONFIRM[Confirm → ledger writes]
    REVIEW --> DISCARD[Discard → job + staging removed]
```

AI provider selection: `GROQ_API_KEY` → `GEMINI_API_KEY` → none (CSV/PDF regex
still work; image uploads error with guidance).

### 4.2 Known architectural debts **[Current → Proposed fixes]**

| Debt | Consequence | Proposed fix |
| --- | --- | --- |
| `ProcessImport` runs synchronously inside the upload request (AI budget alone up to 120s) | Slow requests, gateway timeouts on big statements, no horizontal isolation | Async job worker: upload returns `202 + jobId` immediately; worker consumes a Redis-backed queue; the `ImportJob.status` field already models this — Phase 2 roadmap |
| Raw file bytes are parsed in-memory and not persisted | Re-processing impossible; but privacy-friendly | Keep no-persistence as the *default* (privacy-first) and document it in the privacy hub; optional debug retention behind explicit consent **[Proposed]** |
| PDF text sampled into logs (`[pdf] sample: …`) | **Financial data in logs** — conflicts with §7 privacy stance | Remove/behind debug flag before privacy hub ships (roadmap P1 item) |
| Anomalies live only on the job | Not visible after leaving import screen | Anomaly feed/badges in dashboard (EXP-003 UX) |

## 5. Core sequences

### 5.1 Statement import — current **[Current]**

```mermaid
sequenceDiagram
    actor U as User
    participant W as web /import
    participant A as api/common
    participant AI as Groq/Gemini
    participant M as MongoDB

    U->>W: choose file (CSV/PDF/receipt)
    W->>A: POST /import/upload (multipart, JWT)
    A->>M: create ImportJob (processing)
    A->>AI: extract / categorize / narrate
    AI-->>A: transactions + labels + summary
    A->>M: staged transactions, anomalies, summary
    A-->>W: job result (synchronous today)
    U->>W: review, fix categories
    W->>A: PUT /import/transaction/:id/category
    U->>W: confirm
    W->>A: POST /import/:jobId/confirm
    A->>M: write expenses/incomes to ledger
```

### 5.2 Downloadable report — target (EXP-004) **[Proposed]**

```mermaid
sequenceDiagram
    actor U as User
    participant W as web /reports
    participant A as api/common
    participant M as MongoDB

    U->>W: pick period + report type, "Download"
    W->>A: POST /api/v1/reports (period, format: pdf|csv)
    A->>M: aggregate (reuses report pipelines)
    A->>A: render artifact (CSV writer / PDF template)
    A-->>W: signed/streamed download
    A--)UP: event: Report Generation (counter only)
```

### 5.3 Delete-all data right — target (USR-002) **[Proposed]**

```mermaid
sequenceDiagram
    actor U as User
    participant W as web /settings
    participant A as api/common
    participant M as MongoDB

    U->>W: "Delete my financial history"
    W-->>U: consequences + type-to-confirm
    W->>A: POST /api/v1/account/purge
    A->>M: mark purge_requested (grace window, e.g. 7 days)
    Note over A,M: reversible during grace · then hard-delete<br/>expenses, incomes, categories, imports, jobs
    A-->>W: scheduled + effective date
```

## 6. Deployment view **[Current]**

- Compose: mongo, redis, api-common :8080, web :3000 (healthcheck-gated).
- Helm: standard-form chart (api-common, web; `envFrom` secret hook; values
  document the external MongoDB/Redis requirement).
- Terraform: cluster-agnostic helm release.
- Target additions: worker deployment for async imports (same image,
  worker command) **[Proposed]**, no new stateful services.

## 7. Cross-repo dependencies

| ID | Dependency | Blocks |
| --- | --- | --- |
| D1 | `account.cuesoft.io` contract | ECO-AUTH migration (local JWT is the interim) |
| D2 | Upstat event-ingestion API | ECO-ANALYTICS events |
| D3 | Expendit clause on `privacy.cuesoft.io` | EXP-005 copy |

---

## 8. Target architecture (post-ratification: X-3/X-4/X-5, E-1) **[Decided]**

```mermaid
flowchart LR
    subgraph Cloud Run
        API[api/common — Go]
        WK[import worker — same image,<br/>queue consumer]
    end
    subgraph Data plane
        PG[(Aiven Postgres — X-5)]
        RD[(Aiven Redis — queue,<br/>rate limits, REDIS_DB tenancy)]
        CS[(Cloud Storage — report/export artifacts)]
    end
    MONO[Mono] -->|widget/exchange + signed webhooks| API
    VX[Vertex AI — Gemini, ADC] --- WK
    WEB[web — App Hosting] --> API
    API --> PG
    API --> RD
    WK --> RD
    WK --> PG
    WK --> VX
    API --> CS
    SCHED[Cloud Scheduler] -->|daily syncs, TTL purges,<br/>deadline banners| JOBS[Cloud Run jobs — same image]
    JOBS --> PG
```

- **Scaling**: api/common 1 vCPU/512 MiB, concurrency 80, 0–5 instances;
  worker 1 vCPU/1 GiB, concurrency 1 (AI budget isolation), 0–3; jobs
  scheduled, min-instances 0 everywhere **[Decided defaults]**.
- **Security boundaries**: Mono tokens encrypted (KMS key via Doppler);
  webhooks signature-verified pre-processing; Vertex via service-account ADC
  (no keys); Postgres/Redis private-network + TLS (Aiven).
- **Failure branches for the §5 sequences**: report render failure →
  `500 internal`, artifact row not created, client retry; purge job crash →
  grace state persists, next scheduled run resumes (idempotent deletes);
  bank sequence failures per flows/bank-link.md §2.
