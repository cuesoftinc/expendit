# Expendit — Roadmap

> Ordered plan from the gap analysis (api.md §3). Expendit's engine exists;
> the phases complete the trust surface, then scale the pipeline, then expand
> acquisition channels. Each phase is independently shippable.

## Phase 0 — Landing preview + privacy hub (the two web Musts)

| Item | Requirement | Notes |
| --- | --- | --- |
| Example-report preview section on `/` with synthetic data | EXP-001 | Reuses existing chart components; a small committed demo dataset — never real personal bank data (PRD §5) |
| `/privacy` page: retention, storage, deletion rights, **third-party AI processing disclosure** | EXP-005 | Links to Expendit clause on privacy.cuesoft.io (D3); content mirrors data-model.md §4 |
| Remove financial data from logs (`[pdf] sample:` line) | EXP-005 credibility | Small code change but scheduled here because the privacy hub's claims must be true the day it ships |
| CTAs aligned to PRD ("Open Expendit", "Upload Statement", "View Security Policy") | PRD §6 | Copy/design pass |

**Exit criteria:** a visitor understands the product and its privacy posture
without signing in; no financial payloads in server logs.

## Phase 1 — Downloadable reports + data rights (remaining Musts)

| Item | Requirement |
| --- | --- |
| Report artifact generation: monthly summary + cash-movement, PDF/CSV | EXP-004 |
| Reports UI: generate/download, artifact history (TTL) | EXP-004 |
| Full-history export (CSV/JSON archive) reachable from settings | USR-001 |
| Account purge with grace window + confirmations | USR-002 |
| Consent records (ToS/privacy/AI-processing) | PRD §7 |

**Exit criteria:** every §7 user right is a working button; EXP-004 acceptance
met (downloadable summaries + cash movement).

## Phase 2 — Pipeline hardening & intelligence UX

| Item | Requirement / driver |
| --- | --- |
| Async import worker (202 + job polling; Redis-backed queue) | EXP-002 scale — the 120 s synchronous AI budget can't live inside requests |
| Upload limits + typed errors | EXP-002 hardening |
| Anomaly surfacing beyond import: dashboard feed/badges | EXP-003 "alerts" |
| Correction feedback loop (corrections inform future categorization) | EXP-003 quality |
| Import→confirm conversion + correction-rate metrics | prd.md §7 metrics |

**Exit criteria:** a 15 MB statement (the limit) imports without request timeouts;
anomalies visible on the dashboard; categorization measurably improves from
corrections.

## Phase 3 — Bank linking + identity

| Item | Requirement | Notes |
| --- | --- | --- |
| Mono (E-1 ratified) link/sync/re-auth flows into the shared staged-review pipeline | BNK-001/002 | NG-first; Plaid layers on later for international (E-1) |
| Firebase Google-only identity migration | E3-1, X-1 | `account.cuesoft.io` facade is a later cosmetic cutover — **not** blocked by D1 |
| Upstat events: `upload_success`, `report_generation` | ECO-ANALYTICS | **Blocked by D2**; ship behind the same no-op client wrapper pattern as apparule |
| Support routing to clients.cuesoft.io | ECO-SUPPORT | Link-outs |

**Exit criteria:** bank linking live end-to-end (Mono connect → sync →
staged review); identity migration shipped; ecosystem events flowing once
D2 lands.

## Dependencies

| ID | Dependency | Blocks |
| --- | --- | --- |
| D1 | `account.cuesoft.io` facade | Nothing (X-1: Firebase ratified; facade later) |
| D2 | Upstat event-ingestion API | Phase 3 events |
| D3 | Expendit clause on privacy.cuesoft.io | Phase 0 privacy hub copy |

## Sequencing rationale

Phases 0–1 close every **Must** with the least engineering (the engine already
exists) and make the privacy story real before growth work; Phase 2 pays the
scaling debt in the pipeline the PRD's traffic assumes; Phase 3 ships bank
linking (Mono, E-1 ratified) and the identity migration (X-1) — neither waits
on D1, and only the ecosystem-events row waits on D2.

---

## Phase 4+ — Company financials, tax, mobile parity

- **Phase 4 — Company financials**: org model migration (personal org
  auto-create), statement upload + line-item mapping review, ratio engine +
  trends (CMP-001…003).
- **Phase 5 — Tax center**: profile/calendar/estimates (TAX-001), filing
  wizard generating filing-ready documents (TAX-002); direct e-filing (TAX-003)
  behind jurisdiction/partner availability.
- **Phase 6 — Mobile parity** (receipt capture first) + Brex-system dashboard
  restyle completes (design.md rolls out progressively from Phase 3).

Gates: the tax-jurisdiction decision (E-2) is Phase 5 entry criteria; company
features require the org migration to ship first.
