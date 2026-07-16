# Expendit — Decision Sheet

> Ratify by checking a box; each decision flips its **[Proposed]** tags to
> **[Decided]** and unblocks the listed phases. Status: ☐ open · ☑ ratified.

> **RATIFIED 2026-07-16** — all recommendations approved wholesale ("decisions
> look solid"). Where other docs still carry **[Proposed]** on these topics,
> this sheet governs; tags flip to **[Decided]** as docs are next touched.

## E-1 · Bank aggregator — gates Phase 3 (Bank linking)

| Option | For | Against |
| --- | --- | --- |
| **(a) Mono (NG-first) + Plaid added later for international** ⭐ | The surviving credible NG aggregator (Okra wound down in 2025); direct fit for the core market; Plaid layers on cleanly behind the same `BANK_LINK.provider` field | Two integrations over time |
| (b) Plaid only | One global provider | NG institution coverage is the whole point of v1 |
| (c) Build direct bank integrations | No middleman | Not remotely worth it at this stage |

**Also ratify with it:** consent UX = provider-hosted flow (their widget), we
store only provider tokens (encrypted) + masked metadata; sync cadence default
**daily + manual refresh**.

☑ Ratified: option (a) Mono NG-first, Plaid later

## E-2 · Tax jurisdiction & filing path — gates Phase 5 (Tax center)

**Recommendation ⭐: Nigeria-first.** v1 computes **PIT (personal), CIT
(company estimate), VAT summary** from the categorized ledger + mapped
statements, and generates **filing-ready documents** (guided handoff). Direct
e-filing (TAX-003) only lands where a credible API/partner exists — evaluated
after v1 ships. Other jurisdictions = explicit later scope, config-driven via
the tax-profile model.

☑ Ratified (jurisdiction: Nigeria)

## E-3 · AI processing of financial data — gates the privacy hub copy (Phase 0)

| Option | For | Against |
| --- | --- | --- |
| **(a) Keep Groq→Gemini with explicit disclosure + `ai_processing` consent; self-hosted model as a roadmap item for cloud** ⭐ | Works today; honest; consent recorded per user | Financial data transits third parties (disclosed) |
| (b) Self-hosted extraction model before launch | Strongest privacy story | Big ML lift now; blocks everything on it |
| (c) Drop AI features | — | Guts EXP-003 |

☑ Ratified: option (a) Groq→Gemini + disclosure/consent

## E-4 · Org model migration — gates Phase 4 (Company financials)

**Recommendation ⭐:** introduce `ORG` with **auto-created personal org per
user** (migration maps `userid` scoping → personal org); company orgs with
owner/admin/member roles. One-way, reversible-by-backup migration executed at
the start of Phase 4, not before (personal features don't need it).

☑ Ratified

## E-5 · Retention defaults — published in the privacy hub (Phase 0)

**Recommendation ⭐:** raw uploads **never at rest** (parse in-memory, keep
the current behavior) · import jobs + staging **90 days** after
confirm/discard · report artifacts **30 days** (regenerable) · ledger data
until user deletion · purge grace window **7 days**.

☑ Ratified as recommended

## E-6 · Currency handling

**Recommendation ⭐:** v1 = **single currency per org** (₦ default, set at org
creation); no FX conversion. Multi-currency consolidation stays a non-goal
until a real customer needs it.

☑ Ratified

## Cross-cutting

- **X-1 account.cuesoft.io / identity (RATIFIED)**: interim + sandbox identity
  is **Firebase Authentication on GCP project `sandbox-e306a`** ("sandbox") —
  Google sign-in + email flows come from Firebase; services verify Firebase ID
  tokens (OIDC-compatible). The `account.cuesoft.io` facade fronts this later
  without contract changes. Environment/secrets live in **Doppler**
  (`cueprise/cuesoft_stg`; see also the `cuesoft-iac` project) — CLI token
  currently expired (`doppler login` to refresh); config names to be mirrored
  into docs once readable. ☑
- **X-2 Docs platform**: GitBook space per product, Git-synced; Scalar API
  refs. ☑
- **X-3 Cloud deployment target (RATIFIED, directive)**: all backend
  services run on **Google Cloud Run** (per-service containers — the same
  `cuesoft/<repo>-<service>` images), following the cueprise pattern
  (IaC precedent in `cuesoft-iac`); frontends deploy to **Firebase App
  Hosting**. Helm + terraform in `deploy/` remain the **self-host** path —
  cloud and self-host share images, not manifests. ☑
