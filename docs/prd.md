# Expendit — Product Requirements Breakdown

> Source: "Expendit Product Requirement Document" (provided 2026-07-15) combined
> with the repository state on `main`. The linked
> [Figma file](https://www.figma.com/design/P2lGfKFLJPS9k9kTKlii1n/Expendit)
> currently contains an empty "Home" canvas — the implemented landing page and
> the PRD component table are the working references until designs land.
>
> Markers: **[PRD]** = stated requirement, **[Current]** = verified repository
> fact, **[Proposed]** = design decision introduced here for ratification.

## 1. Product definition

Expendit is a financial-analysis and expense-intelligence product: it turns raw
financial data — bank statements, receipts, CSV exports — into structured,
categorized, anomaly-checked reports of spending and cash movement, for
individuals, SMEs, and operational teams. **[PRD]**

`expendit.cuesoft.io` is both the landing page and the application entry point.
**[PRD §1.1]** Unlike apparule (whose web property fronts a mostly-unbuilt
platform), Expendit's core intelligence loop **already exists in this repo**:
upload → parse (CSV/PDF/receipt image) → AI categorization → duplicate &
anomaly detection → reviewable staging → confirm into the ledger. The PRD phase
is therefore mostly about *completing the trust surface* (privacy, data rights,
downloadable artifacts) and *ecosystem integration*, not building the engine.

## 2. Personas and jobs-to-be-done

| Persona | Job-to-be-done | Primary surface |
| --- | --- | --- |
| Individual users | Automated tracking/categorizing of monthly spending | Dashboard, import hub |
| SMEs | Lightweight expense management without ERP overhead | Dashboard, reports, exports |
| Operational teams | Cash-position analysis and financial reporting | Reports, downloadable summaries |
| Cuesoft partners | Product incubation, internal financial auditing | Whole stack |

## 3. Functional requirements

### 3.1 Stated requirements, mapped against current state

| ID | Requirement | Priority | Current state **[Current]** | Gap |
| --- | --- | --- | --- | --- |
| EXP-001 | Report Preview Landing — visitors see example insights/charts without authenticating | Must | Landing page exists (hero, services, features, how-it-works, open-source, contact sections) | Add an *example report/chart preview* section with demo data; must never use real personal bank data **[PRD §5]** |
| EXP-002 | Universal File Upload — bank statements (PDF) + CSVs | Must | **Implemented**: `POST /import/upload` accepts CSV/tabular, PDF (text-extraction → AI → regex fallback), and receipt images (JPG/PNG/WEBP/HEIC via AI vision) | Hardening: size limits, async processing (see architecture.md §4.2), clearer failure surfaces |
| EXP-003 | AI Categorization — grouping, user correction, anomaly alerts | Should | **Implemented**: categorization engine + Groq→Gemini enhancer; per-transaction category correction endpoint; 4 anomaly types (large transaction, spending spike, abnormal category, duplicate charge) persisted per job | Alert *UX* (surfacing anomalies beyond the import screen); correction feedback loop into the engine **[Proposed]** |
| EXP-004 | Summary Reports — downloadable financial summaries & cash-movement reports | Must | Summaries computed (totals, net cash flow, by-category, monthly trends, AI narrative) but only served as JSON; 3 chart aggregation endpoints | **Downloadable artifact generation (PDF/CSV) is missing** — the main Must-gap |
| EXP-005 | Privacy Hub — disclosure on retention, storage, deletion rights | Must | Nothing | New page + `privacy.cuesoft.io` clause link; pairs with USR-001/002 below |

### 3.2 Ecosystem requirements

| ID | Requirement | Notes |
| --- | --- | --- |
| ECO-AUTH | Identity via `account.cuesoft.io` | Same external dependency as the other products (D1). Current: own JWT auth (signup/signin/Google/reset, rate-limited) — a solid interim. |
| ECO-SUPPORT | Disputes/technical issues route to `clients.cuesoft.io` | Link-out from dashboard/settings. |
| ECO-ANALYTICS | "Upload Success" and "Report Generation" events via Upstat | Depends on Upstat event API (D2). Events must be **privacy-compliant**: counters only, never financial payloads. **[PRD §4.2]** |

### 3.3 Derived user-rights requirements **[PRD §7 made explicit]**

| ID | Requirement |
| --- | --- |
| USR-001 | Visible route to **export the user's entire financial history** (machine-readable, at minimum CSV/JSON archive) at any time |
| USR-002 | Visible route to **delete the entire financial history** (account-level purge with confirmation + grace semantics **[Proposed]**) |
| USR-003 | Data-retention disclosure consistent with actual storage behaviour (see data-model.md §4) |

## 4. Non-goals (initial release)

- **Direct bank/SMS integration** — explicitly staged *after* file-based
  uploads. **[PRD §5]** Roadmap Phase 3.
- Building the ecosystem services themselves (account/clients/privacy hubs).
- Multi-currency consolidation, budgeting/forecasting features (not in PRD).
- Double-entry accounting semantics — Expendit is intelligence, not bookkeeping.

## 5. Brand & content requirements

- Aesthetic: trustworthy, analytical, privacy-sensitive; data-rich dashboards,
  interactive charts, transaction previews. **[PRD §2]**
- Afrocentric geometric patterns, enterprise polish (ecosystem alignment). **[PRD §2]**
- Messaging: "privacy-first financial intelligence" over generic expense
  tracking. **[PRD §6]**
- CTAs: "Open Expendit", "Upload Statement", "View Security Policy". **[PRD §6]**
- Case studies: retail SMEs, freelancers, individual cash-flow optimization. **[PRD §6]**

## 6. Compliance & safety requirements

| Concern | Requirement |
| --- | --- |
| Data classification | All financial data is **high-sensitivity** **[PRD §5]**; classification table in data-model.md §4 |
| Demo data | Landing previews and demos must use synthetic data only **[PRD §5]** |
| Privacy clause | Adhere to the Expendit-specific clause in `privacy.cuesoft.io` **[PRD §7]** (content dependency D3) |
| User control | USR-001/002 above — export + full deletion, visibly reachable **[PRD §7]** |
| AI processing disclosure | Statements/receipts are sent to third-party AI providers (Groq/Gemini) for extraction & categorization **[Current fact that §7 disclosure must cover — Proposed to make explicit in the privacy hub]** |

## 7. Success metrics

| Metric | Source | Requirement |
| --- | --- | --- |
| Upload Success | Upstat event on completed import job | ECO-ANALYTICS **[PRD]** |
| Report Generation | Upstat event on report/export creation | ECO-ANALYTICS **[PRD]** |
| Import → confirm conversion | api/common (jobs confirmed ÷ jobs created) | **[Proposed]** — measures trust in AI staging |
| Correction rate per import | api/common | **[Proposed]** — categorization quality signal |

## 8. Open questions

1. **AI provider disclosure & data residency** — statements are processed by
   Groq/Gemini today. Does the privacy commitment allow this by default, or is
   an opt-in / self-hosted-model path required for the cloud offering?
2. **`account.cuesoft.io` migration** — current users hold Expendit-local
   credentials; migration/coexistence strategy needed when D1 lands.
3. **Retention default** — uploaded source files (statements/receipts): stored
   how long after a job is confirmed/discarded? data-model.md proposes
   delete-on-confirm for raw files, retain derived transactions **[Proposed]**.
4. **Figma designs** — Home canvas empty; the implemented landing becomes the
   de-facto design until a Figma pass exists.
