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

☑ Ratified: option (a) — **revised by X-4 (2026-07-16): cloud uses Vertex AI
(Gemini, ADC) instead of consumer Groq/Gemini APIs; financial data stays in
GCP. Disclosure + `ai_processing` consent still apply; Groq/Gemini env keys
remain the self-host fallback.**

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
  tokens (OIDC-compatible). `account.cuesoft.io` **is not built yet** — each app replicates the
  sign-in/sign-up screens **in-app** (own UI per its design system,
  Firebase Auth underneath: Google sign-in + email/password flows). The
  central facade fronts the same Firebase project later without contract
  changes; in-app screens then become optional, not obsolete. **HARDENED
  2026-07-16: Google sign-in is the ONLY method — no username/password
  signup or login, product-wide.** Email/Password provider disabled at
  the Firebase project; backends reject non-Google-provider tokens
  (`provider_not_allowed`); UI ships exactly one auth CTA. Full contract:
  [flows/auth.md](flows/auth.md). Environment/secrets live in **Doppler**
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
- **X-4 AI platform (RATIFIED, directive 2026-07-16)**: AI features use
  **Vertex AI** (Gemini via `{region}-aiplatform.googleapis.com`, ADC from the
  service account — the `cuesoft-iac/functions/cueprise-gemini-proxy` pattern;
  reference model `gemini-2.5-flash-lite`, region `us-central1`). No
  consumer-API keys to third-party AI vendors in cloud deployments — data
  stays inside GCP, which strengthens every privacy disclosure. Self-host
  fallback: bring-your-own Gemini/Groq key via env (existing code path). ☑
- **X-5 Data plane (RATIFIED 2026-07-16, per-product DB decided by delegation)**:
  **Aiven Postgres** as the system of record — financial aggregation, audit
  trails, ratio/tax traces, and org joins are SQL-shaped. Mongo→Postgres
  migration is scheduled WITH the E-4 org migration (one migration, not two);
  self-host compose keeps Mongo until then, then switches to a Postgres
  container.
  **Shared Redis**: the sandbox **Aiven Redis** instance, tenancy by
  **`REDIS_DB` index** (the irealty pattern: discrete `REDIS_HOST/PORT/
  USERNAME/PASSWORD/TLS/DB` vars; e.g. irealty prd=0, stg/dev=1) — indices
  per product/config assigned in Doppler by the owner. **Doppler is the env source of truth: services read project `expendit`,
  config `stg`** (X-6: stg=sandbox is the only live env; `dev*` are local-dev
  conveniences and `prd` sits empty until a production ever exists —
  `cueprise/cuesoft_stg` was the *pattern reference*, not expendit's source).
  Redis DB index recorded here when assigned: `expendit/stg = TBD-by-owner`. **Object storage**: the **default Cloud Storage bucket** in
  `sandbox-e306a` (per-product prefixes `expendit/<env>/…`) for capture
  media, exports, and artifacts. Self-host compose keeps its bundled
  stores. ☑
- **X-6 Environments & deploy gating (RATIFIED 2026-07-16, deliberate
  deviation from the cueprise norm)**: `stg` = **sandbox** and is the ONLY
  environment — no production deployment exists for these products. Secrets
  live in Doppler `<project>/stg`. Because these repos are **open source**,
  merge-to-main must NOT deploy: main-merge runs build+test only. **Deploys
  happen exclusively on tag creation (`v*`)**, treated as production-grade:
  a GitHub tag ruleset restricts `v*` creation to owner-level access, and the
  deploy workflow additionally runs in a protected GitHub environment. ☑
