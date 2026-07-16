# Expendit — Granular Feature Register

> Roadmap phases decomposed into implementation-sized units (each ≈ one PR).
> IDs stable for PR references (`feat(E1-2): …`). Acceptance detail lives in
> the referenced specs.

## Phase 0 — Landing preview + privacy (Musts)

| ID | Unit | Delivers | Refs | Deps |
| --- | --- | --- | --- | --- |
| E0-1 | Design tokens package | `expendit/tokens` → CSS vars/Tailwind; Brex-system foundations | design.md §2/§7 | — |
| E0-2 | Landing restyle shell | Brex editorial sections skeleton on existing page, nav/footer per pages.md A | pages.md A1–A11 | E0-1 |
| E0-3 | Demo-report preview section | EXP-001 synthetic datasets ×3, tab switcher, demo badge | pages.md A5 | E0-2 |
| E0-4 | Privacy hub page | retention/rights/AI-disclosure copy from data-model §4 + E-3 | pages.md A7, prd §6 | E0-2 |
| E0-5 | Log-hygiene fix | remove statement text from logs + never-log grep gate | architecture §4.2, engineering §5 | — |
| E0-6 | Analytics client wrapper | queued upstat client, registry events | upstat api.md §3.4 | E0-2 |

## Phase 1 — Downloadables + data rights (Musts)

| ID | Unit | Delivers | Refs | Deps |
| --- | --- | --- | --- | --- |
| E1-1 | Report artifact engine | monthly summary + cash-movement + category deep-dive (`category` param), PDF/CSV render, TTL storage (Cloud Storage) | api.md §2, EXP-004 | — |
| E1-2 | Reports UI | generate/download/history MI-14 | pages.md B5 | E1-1 |
| E1-3 | Export-all | full-history archive job (CSV/JSON) | USR-001 | E1-1 |
| E1-4 | Purge flow | grace-window purge + MI-15 danger UX | USR-002, architecture §5.3 | — |
| E1-5 | Consent records | tos/privacy/ai_processing + gate | flows/auth §4 | — |

## Phase 2 — Pipeline hardening + intelligence UX

| ID | Unit | Delivers | Refs | Deps |
| --- | --- | --- | --- | --- |
| E2-1 | Async import worker | 202+polling, queue (shared Redis), timeout reaper | flows/import §1–3 | — |
| E2-2 | Upload limits + failure taxonomy | size/MIME limits, every 4xx/5xx code + fixture files | flows/import §3, engineering §1 | E2-1 |
| E2-3 | Vertex AI migration | Groq/Gemini consumer APIs → Vertex (ADC); self-host BYO-key fallback | X-4, E-3 | — |
| E2-4 | Anomaly surfacing | dashboard feed/badges MI-5 beyond import screen | pages.md B1 | — |
| E2-5 | Correction feedback loop | corrections inform categorization | EXP-003 | — |
| E2-6 | Quality metrics | import→confirm conversion, correction rate | prd §7 | E2-1 |

## Phase 3 — Auth migration + bank linking

| ID | Unit | Delivers | Refs | Deps |
| --- | --- | --- | --- | --- |
| E3-1 | Firebase Google-only auth | token middleware, link-by-email migration, 60-day window, legacy retirement | flows/auth §1–3 | — |
| E3-2 | Mono link flow | connect widget, exchange, encrypted tokens | flows/bank-link §1 | E3-1 |
| E3-3 | Sync engine | daily + manual sync → import jobs, cursors, backoff | flows/bank-link §2 | E2-1, E3-2 |
| E3-4 | Re-auth + lifecycle | reauth banners, pause, unlink keep/purge | flows/bank-link §3 | E3-3 |
| E3-5 | Bank webhooks | signature-verified /webhooks/bank | flows/bank-link §4 | E3-2 |
| E3-6 | Auto-confirm trust path | opt-in after 3 clean syncs, anomaly override | flows/import §5 | E3-3 |

## Phase 4 — Org model + company financials

| ID | Unit | Delivers | Refs | Deps |
| --- | --- | --- | --- | --- |
| E4-1 | Mongo→Postgres migration | schema per data-model, parity harness, cutover | X-5, engineering §4 | — |
| E4-2 | Org model | personal-org auto-create, roles, org switcher | data-model §5, E-4 | E4-1 |
| E4-3 | Statement upload + mapping | canonical line-item staging (file upload · scanned-image vision path · manual JSON entry), AI-suggested mapping, review UI with add-row | line-items.md §1–4, flows/statement-mapping.md, pages.md B6 | E4-2 |
| E4-4 | Ratio engine | 22 registry metrics (17 ratios + growth/value rows) + benchmark-band constants + formula traces + identity cross-checks | line-items.md §5 | E4-3 |
| E4-5 | Ratio UI | RatioGauge grid MI-8, trends (ratios + line items), export | pages.md B6 | E4-4 |
| E4-6 | Authz matrix enforcement | member/admin/owner capabilities + tests | engineering §2 | E4-2 |
| E4-7 | Statement viewer + artifact export | normalized statement view (derived rows flagged, mapping warnings, period selector) + `financial_statement` report kind | pages.md B6, line-items.md §4, api.md §2 | E4-3, E1-1 |

## Phase 5 — Tax center

| ID | Unit | Delivers | Refs | Deps |
| --- | --- | --- | --- | --- |
| E5-1 | Rule-set mechanism | versioned TAX_RULESET + period resolution + sign-off gate + filing calendar & remittance-authority registry | tax-engine §1, §5.5 | E4-1 |
| E5-2 | PIT engine | both regimes, band tests, rent relief, category treatments | tax-engine §2 | E5-1 |
| E5-3 | CIT engine | classification, adjustments worksheet, levy | tax-engine §3 | E4-4, E5-1 |
| E5-4 | VAT engine | treatments, net position, monthly deadlines MI-13 | tax-engine §4 | E5-1 |
| E5-5 | Filing wizard | WizardShell MI-10, traces, document generation incl. remittance sheet, tax-identity gate (`tax_identity_incomplete`) | pages.md B7, tax-engine §5–5.5 | E5-2..4 |
| E5-6 | Tax golden suite | band-edge fixtures per rule set (launch gate) | engineering §4 | E5-2..4 |

## Phase 6 — Mobile parity (receipt-capture-first) — units defined at phase entry

## Cross-phase engineering units

| ID | Unit | Refs |
| --- | --- | --- |
| EX-1 | Error envelope middleware + catalog tests | engineering §1 |
| EX-2 | ⌘K palette + Inspector + saved views (PLT-001) | design.md MI-1/MI-11 (saved views: table-state persistence, no dedicated MI) |
| EX-3 | Rate limiting (shared Redis) | engineering §3 |
| EX-4 | build-and-test.yml + release.yml (tag-gated) | deployment.md, X-6 |
| EX-5 | cuesoft-iac expendit stack (Cloud Run, WIF, Doppler, Aiven PG) | deployment.md §2, X-5 |
| EX-6 | E2E smoke (release gate) | engineering §4 |
| EX-7 | OTel instrumentation (traces/metrics/log bridge, env-gated export → upstat) | engineering §Telemetry, X-9 |
