# Expendit — Pages, Screens & Features

> Component-level surface inventory referencing [design.md](design.md)
> (`MI-n`). Part A public home page, Part B dashboard, Part C mobile sketch.
> The 2026-07-16 expansion **[Directive]**: bank-account linking, company
> financial-records analysis (solvency/profitability ratios), tax calculation
> **and filing**.

## Part A — Public home page (expendit.cuesoft.io)

Shared CueLABS open-source-site pattern: product presentation → developer
setup → Discord + GitHub + preview links → **Try Cloud** / **Self Host** CTAs
**[Directive]**. Brex-style editorial execution (design.md §1.2).

| # | Section | Content & components | Interactions |
| --- | --- | --- | --- |
| A1 | Nav | logo · Product · Solutions (Individuals/SMEs/Companies) · Docs (GitBook) · Community · GitHub badge · Sign in · **Try Cloud** | sticky; dark-on-light after hero scroll |
| A2 | Hero (dark editorial) | display-type H1 "Financial intelligence for modern growth"; sub; dual CTA **Try Cloud** / **Self Host**; hero visual: dashboard in device frame with animated categorization chips | chips animate once; pauses reduced-motion |
| A3 | Logos/social proof strip | placeholder for case-study logos (PRD §6) | |
| A4 | Product pillars | 3 editorial cards: **Statements → intelligence** (upload/link), **Company financials** (ratios), **Taxes** (calculate + file) | card hover: 2px lift + accent underline draw |
| A5 | Interactive preview (EXP-001) | embedded read-only demo report: synthetic txn table + category donut + cash-flow line; "This is demo data" badge | tabs switch datasets (freelancer/SME/company); MI-7 count-ups |
| A6 | AI section | how categorization/anomalies work + privacy note inline (AI providers disclosed) | |
| A7 | Security & privacy | encryption, retention, delete-all rights; links: security policy + privacy hub (D3) | |
| A8 | Open source | `docker compose up` snippet + copy; architecture mini-diagram; GitHub/CONTRIBUTING | copy ✓ morph |
| A9 | Community | Discord card + roadmap link | |
| A10 | Cloud vs Self-host | comparison table; per-column CTAs | |
| A11 | Footer | standard + "View Security Policy" CTA (PRD §6) | |

Events → Upstat (D2): `page_view`, `try_cloud_click`, `self_host_click`,
`github_click`, `demo_interact`.

## Part B — Dashboard (app)

Left nav groups **[Proposed]**: Overview · Transactions · Imports · Accounts
(bank links) · Reports · **Company** (statements, ratios) · **Taxes** ·
Categories · Settings. ⌘K palette everywhere (MI-1). Org switcher atop nav
(personal ↔ company orgs, data-model.md §5).

### B1 `/dashboard` — Overview
- StatCard row: net cash flow, income, expenses, runway (company orgs) (MI-7).
- Cash-flow chart (12mo), category donut, anomaly feed (MI-5), latest
  transactions table (5 rows → Transactions).
- Empty state: MI-16 with demo-data toggle.

### B2 `/transactions` — Ledger
- Full `TxnTable` (virtualized): filters (date range, category, source,
  direction, amount range, anomaly-only), saved filter views, search.
- Inline category edit (MI-4), row inspector (MI-11) with split-transaction
  and exclude-from-reports controls **[Proposed]**.
- Bulk select → bulk re-categorize / export selection.

### B3 `/imports` — Import hub
- UploadDropzone (CSV/PDF/receipt image) (MI-2) + import-job history table
  (status, counts, anomalies found).
- Job detail: staged-review table (AI categories ✨, duplicates pre-flagged),
  per-row category fix (MI-4), then confirm/discard (MI-3).
- Async model (202 + polling) per architecture.md §4.2.

### B4 `/accounts` — Linked bank accounts **[Directive — new]**
- `LinkAccountCard` grid + "Link account" CTA → provider flow (MI-9).
- Aggregator: **Mono/Okra for NG banks, Plaid/TrueLayer international —
  decision to ratify** (architecture.md §8).
- Per-account: sync schedule, last sync, imported-txn count, pause/unlink
  (unlink offers keep-or-purge history choice).
- Synced transactions land in the same staged-review pipeline as uploads
  (single ingestion path **[Proposed]**), auto-confirm option per account
  once trust is established.
- Re-auth banners when a link expires (design.md banners).

### B5 `/reports` — Reports & downloads (EXP-004)
- Generate: monthly summary / cash-movement / category deep-dive; period
  picker; format PDF/CSV.
- Artifact history table (TTL'd) with download (MI-14).
- Scheduled reports (monthly email) **[Proposed, later]**.

### B6 `/company` — Company financials **[Directive — new]**
- **Statements**: upload balance sheet / income statement / cash-flow
  (CSV/XLSX/PDF via the same dropzone); mapped into a normalized line-item
  model (data-model.md §5) with a mapping-review step (like staged txns:
  AI-suggested line mapping, human confirm) (MI-2/3 reused).
- **Ratios** (`/company/ratios`): RatioGauge grid (MI-8), grouped:
  - *Liquidity*: current ratio, quick ratio, cash ratio
  - *Solvency*: debt-to-equity, debt ratio, interest coverage
  - *Profitability*: gross/operating/net margin, ROA, ROE
  - *Efficiency*: asset turnover, inventory turnover, receivables days
  - Each gauge: value, period delta, benchmark band, "how we got this"
    formula trace (MI-8 tooltip → inspector with line items).
- Trend view: ratio time-series across periods; export to report artifact.
- Requires ≥1 mapped statement period; empty state explains inputs needed.

### B7 `/taxes` — Tax center **[Directive — new]**
- Overview: jurisdiction profile (org settings), tax calendar with deadline
  banners (MI-13), estimated liabilities StatCards.
- **Calculators** (v1 scope **[Proposed — jurisdiction to ratify, NG-first]**):
  - Personal income tax (PIT) from categorized income
  - Company income tax (CIT) estimate from company statements
  - VAT summary from ledger (output vs input VAT)
- **Filing wizard** (`/taxes/file`): WizardShell (MI-10): period → data review
  (traceable computed fields) → generated filing forms → submission:
  - v1: produce filing-ready documents + guided handoff (download/export)
  - v2: direct e-filing via jurisdiction APIs/partners where they exist
    **[Proposed staging — "file the taxes" acceptance met in v2]**
- Filing history: immutable records with stamped receipts.

### B8 `/categories`, B9 `/settings`
- Categories: CRUD + color/dot, merge tool, AI-training note.
- Settings: org members/roles (company orgs), data & privacy (export-all
  USR-001, purge USR-002 with MI-15), AI-processing consent, bank-link
  permissions, notifications, theme/density.

## Part C — Mobile app (later phase; parity direction **[Directive]**)

Sketch for the parity roadmap — not scheduled before dashboard/web work:
tabs Home (stat cards + anomalies) · Transactions (list + inline category) ·
**Capture** (receipt camera → import pipeline) · Reports (view/download) ·
Settings. Receipt capture is the mobile-native win (camera → MI-2 lifecycle).

## Feature register delta (extends prd.md)

| ID | Feature | Priority | Surfaces |
| --- | --- | --- | --- |
| BNK-001 | Bank account linking via aggregator, synced into staged review | Must | B4 |
| BNK-002 | Sync scheduling, re-auth, unlink with data choice | Must | B4 |
| CMP-001 | Company org type + financial-statement upload & line-item mapping | Must | B6 |
| CMP-002 | Ratio engine (liquidity/solvency/profitability/efficiency) with formula traces | Must | B6 |
| CMP-003 | Ratio trends + benchmark bands | Should | B6 |
| TAX-001 | Tax profile + calendar + estimates (NG-first) | Must | B7 |
| TAX-002 | Filing wizard producing filing-ready documents | Must | B7 |
| TAX-003 | Direct e-filing integrations | Later | B7 |
| PLT-001 | ⌘K palette, inspector pattern, saved views | Should | all |
| PLT-002 | Mobile app (receipt capture first) | Later | Part C |

Cross-refs: entities → data-model.md §5; API → api.md §5; phases →
roadmap.md revision.
