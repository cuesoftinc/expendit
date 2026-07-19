# Expendit — Web Implementation Standard

> How `web/` gets rebuilt: the **CueLABS™ Web Implementation Standard**
> (ratified 2026-07-18, org-wide **[Directive]**) carried in full, plus the
> Expendit-specific addendum — stage plan, token mapping, route map,
> TEST_MODE contract, mock server, test strategy, legacy/dead-code policy.
> Markers as in [design.md](design.md): **[Directive]** = user-stated
> direction, **[Proposed]** = ratifiable decision, **[Decided <date>]** =
> ratified. Companion contracts: [engineering.md](engineering.md) (errors,
> authz, limits), [design.md](design.md) (tokens, components, MI catalog),
> [pages.md](pages.md) (screens), [api.md](api.md) (surface).

## 1. The standard (ecosystem, shared across the three products)

- **Stack**: Next.js 16 App Router + React 19 + TypeScript; Tailwind maps to
  the token CSS variables (§3). Components are token/Tailwind-based — the
  live tree carries no MUI (§8 boundary gates).
- **Design tokens**: `web/src/design/tokens.css` — CSS custom properties
  mirroring design.md §2 exactly (light on `:root`, dark on
  `[data-theme="dark"]`, honoring `prefers-color-scheme` with manual
  override; spacing 4–64; radii; durations + easings; z layers; on-accent).
  **No raw hex in components** — the same rule as Figma (design.md §7);
  documented exceptions carry a code comment.
- **Components**: `web/src/components/ui/<Name>.tsx` — one module per Figma
  component set, named exactly as the set (PascalCase, design.md §8.1 naming
  standards); props mirror the variant axes (`kind`/`size`/`state`/…);
  microinteractions from design.md §4 implemented with duration/easing
  tokens and `prefers-reduced-motion` fallbacks (design.md §5); each
  component unit-tested.
- **MVC**: models = `web/src/models/` (typed entities per
  [data-model.md](data-model.md) + repositories per
  [api.md](api.md)/[openapi.yaml](api/openapi.yaml) — the **only** layer
  that talks to the network); controllers = `web/src/controllers/`
  (feature-scoped hooks/orchestration, own all state; views never fetch);
  views = `web/src/app/**` routes + composed components, render-only.
- **TEST_MODE**: `NEXT_PUBLIC_TEST_MODE=1` → GoogleAuthButton navigates
  straight to the dashboard (no Firebase), and the API client targets the
  in-app mock server (§5). Auth sits behind an `AuthProvider` interface
  (`TestModeAuthProvider` now; `FirebaseAuthProvider` added at
  backend-integration time — X-1 Google-only either way,
  [flows/auth.md](flows/auth.md)).
- **Mock server**: Next route handlers under `web/src/app/api/mock/*`
  implementing the documented API surface the web needs (paths, snake_case
  error codes, and taxonomies from api.md/openapi.yaml), backed by a seeded
  in-memory store with full CRUD (dev-persistent via a module singleton);
  seed data = the docs-coherent Figma dataset (§6) so the app boots looking
  like the designs. Contract types shared with models.
- **Tests**: Vitest + Testing Library for unit/integration (components,
  controllers, mock handlers); Playwright e2e mirroring the design.md §8.4
  prototype journeys, run in TEST_MODE against the mock server; both wired
  into CI build+test (X-6: merge-to-main never deploys).
- **Legacy / dead-code policy**: before replacement, legacy trees are
  `git mv`-ed into `web/src/legacy/` (structure preserved, excluded from
  build & routing) — live paths carry zero dead code; after the replacement
  passes QA + Playwright, the legacy subtree is deleted in a dedicated
  `chore(web): retire legacy <area>` PR. No dead code outside `src/legacy/`,
  ever; `src/legacy/` itself trends to empty. Expendit's application of the
  policy: §8.
- **Mobile responsiveness canon [Directive 2026-07-19]**: the home page and
  every dashboard route are fully responsive at 390 (768 sanity) — the
  document NEVER side-scrolls. Wide data surfaces (the ledger table,
  staged-review table, statement grids, mapping review) live in
  horizontal-scroll containers (`max-lg:overflow-x-auto`) that scroll
  WITHIN the fixed viewport; ≥lg keeps sticky table headers against the
  main scroll. Grids that collapse to one column declare an explicit base
  `grid-cols-1` (Tailwind's `minmax(0,1fr)` floors the track — implicit
  auto tracks blow out to item min-content and push the page wide); header
  action clusters and row action clusters `flex-wrap` under their titles
  instead of forcing width; the wizard's rail/content/summary columns
  stack below lg. A Playwright sweep (`e2e/mobile-responsive.spec.ts`)
  asserts per route at 390 + 768: document fits the viewport, `<main>`
  never side-scrolls, and any element past the viewport sits inside a
  contained scroll container.
- **Process**: stages W0 → W3 (§2), PR per stage; conventional commits; QA
  loops evaluate the implementation against the Figma file (tokens,
  geometry, states, interactions) before a stage closes; docs + the org
  SKILL.md updated with every deviation.
- **Component reuse policy [Decided 2026-07-18]**: pixel-fidelity to the
  Figma file wins. All **visual** components are built in-house from the
  token layer — no styled component kits in new code (no **new** MUI, no
  shadcn/DaisyUI skins) and no chart libraries (Chart/Line, Chart/Donut,
  RatioGauge needles, and StatCard sparklines are bespoke SVG built to the
  design.md §8.2/§8.2b chart specs). Reuse is allowed only where it is
  invisible: headless behavior primitives (Radix/Base UI class — dialog,
  popover, select, tabs, switch, checkbox, tooltip, accordion semantics
  with focus traps, keyboard nav, ARIA), positioning engines (Floating UI),
  `lucide-react` (the design system's own icon set, design.md §2 — matches
  by construction; brand glyphs like the Google 'G' and GitHub mark as
  local SVGs per the §8.1 icon note), and math/format utilities (d3-scale,
  date-fns, clsx). Fidelity is verified against the Figma file in the stage
  QA loops (screenshot comparison + token/geometry checks).

## 2. Stage plan — W0 foundations → W3 dashboards

One PR per stage; a stage closes only after its QA loop against the Figma
file passes (screenshot comparison + token/geometry/state checks against the
Style Guide, component sets, and screen frames — the same standard as the
design-phase QA loops, design.md §8).

| Stage | Scope | Closes when |
| --- | --- | --- |
| **W0 Foundations** | `tokens.css` (§3) + Tailwind mapping · MVC skeleton (`models/`, `controllers/`, `components/ui/`) · `AuthProvider` interface + `TestModeAuthProvider` · mock server + seed dataset (§5–6) · Vitest + Playwright harnesses wired into CI build+test · `/signin` Google-only (X-1) | tokens render both themes correctly vs the Style Guide page; TEST_MODE boots to a stubbed `/dashboard` against the mock server; CI green |
| **W1 Components** | `components/ui/*` per the design.md §8.1 build order (atoms → molecules → table chrome, charts, app chrome) and §8.2/§8.2b contract rows, MI specs MI-1…MI-16 (all web-applicable) · unit tests per component | every built component passes QA vs its Figma component set (variants, states, both themes, motion specs) |
| **W2 Home** **[Done 2026-07-19, PR #202]** | Part A sections (§4): A1–A11 + iteration rows A4a/A5a/A8a/A10a/A10b · A5 interactive demo (tabs over the three §6 synthetic datasets, "This is demo data" badge) · analytics events to Upstat (D2: `page_view`, `try_cloud_click`, `self_host_click`, `github_click`, `demo_interact`, `contribute_click`, `faq_open`) · runtime GitHub star count on A8 (the A1 nav badge stays neutral "Star" — as built, design.md §8.2b) | QA vs the Stage-5 Figma page; Playwright covers the "Marketing site" §8.4 flow incl. the cross-page CTA handoff into `/signin` |
| **W3 Dashboards** **[Done 2026-07-19, PR #206]** | Part B routes (§4): B0–B9 + B6b/B7b · feature controllers · ⌘K palette (MI-1), Inspector pattern (MI-11), bank-link + filing wizards (MI-9/MI-10), rights flows (MI-15) | QA vs the Stage-4 Figma templates + prototype flows; Playwright covers the "Core journey — sign in" §8.4 flow (§7) |

**W2 as-built notes (2026-07-19, PR #202):**

- The A5 interactive demo is Persona Tabs (pill) over the three §8.3
  synthetic datasets (freelancer/SME/company), with CRUD-light inline
  recategorize (MI-4) on the synthetic txn table and the cash-flow chart's
  data-table parity toggle (§5) wired in.
- The hero visual embeds the real B1 overview composition
  (`DashboardEmbed`) through `ScaledEmbed`, reproducing the Figma
  hero-visual scale exactly — 1037/1440 ≈ 0.72.
- Analytics events land on an in-page queue (`window.__expenditEvents`) in
  TEST_MODE for unit/e2e assertions; the Upstat network beacon is
  env-gated behind `NEXT_PUBLIC_UPSTAT_EVENTS_URL` and fires only outside
  TEST_MODE — the D2 ingestion contract is not yet ratified, so the
  default build ships queue-only.
- The `components/ui/*` registry gained additive extensions discovered in
  the W2 QA loop: `Accordion` `mode="single"` (A10a FAQ, one item open at a
  time), `MarketingFooter` slot prop (bottom-right, beside the security
  CTA), `EditorialCard` `cta` prop, and `MarketingNav` collapse behavior
  below the `md` breakpoint (375w floor keeps logo + CTAs).
- `tokens.css` gained an explicit `[data-theme="light"]` re-declaration
  (alongside `:root`) so theme scoping works when a dark-editorial section
  sits inside a light-scoped subtree.
- **Naming canon:** the Part A section components live in
  `web/src/components/home/` — the canonical path.

**W3 as-built notes (2026-07-19, PR #206):**

- The full authenticated app ships from the W1 registry over the mock CRUD
  server, nested under `/dashboard/<area>` (§4) — B0 onboarding (org
  create with the personal/company kind picker + AI-consent sheet) through
  B9 settings, incl. the B2b anomaly-explain inspector variant, B3b staged
  review (MI-3 counts, duplicate re-include, ✨ fixes) with the B3c
  failure-taxonomy screen, the B4 MI-9 bank-link journey (connect →
  consent → syncing with the live txn counter over a real `bank_sync`
  mock job → done → staged-review handoff), the B6b ratio grid with the
  MI-8 trace inspector, and the B7b filing wizard (traces → remittance
  sheet → typed confirm → stamped, immutable filing history). B9 carries
  the USR-001 export and USR-002 purge (MI-15 typed-confirm, 7-day grace,
  cancel) rights flows.
- **Semantic registry refactor:** `TxnTableRow`/`TableHeader` compose a
  real `<table>`/`<thead>`/`<tr>`/`<td>`/`<th scope="col">` ledger instead
  of div grids; row components that carried a table-context `role=row`
  outside any table (`ImportJobRow`, `MemberRow`, `ReportArtifactRow`,
  `FilingHistoryRow`, `MappingReviewRow`, `TaxCalendarRow`) render as
  `<li>` list rows instead; `WizardShell`'s nested `<main>` becomes a
  `<section>` (one-`<main>`-per-page rule). A follow-up QA pass caught
  every remaining composition site still nesting rows in plain divs (the
  W2 home embeds, the A5 demo table, the DeepDives artifact card, the dev
  gallery) — invalid nesting the HTML parser rearranges during SSR,
  producing a client hydration mismatch; every site now wraps rows in a
  real `<table>`/`<tbody>` or `<ul>`.
- **Boundaries gate:** `scripts/check-boundaries.mjs` (MUI-outside-legacy,
  live-code-importing-legacy, raw-hex-without-comment, and the MVC
  fetch-only-in-repositories-client rule) is wired into `npm run lint`
  alongside prettier/eslint — the CI build-and-test workflow needed no
  changes.
- **New mock endpoints:** `GET /api/mock/report/monthly` (12-month
  income-vs-expense + runway snapshot) and `GET /api/mock/report/category`
  (per-category donut totals) back the B1 aggregates; `POST
  /api/mock/categories/{id}/merge` is the B8 merge tool (same-type only,
  `422 merge_type_mismatch`/`merge_self`); `GET
  /api/mock/reports/{id}/download` serves the signed-URL artifact body for
  B5.
- W2.1 live-site QA (PR #205) rides separately from this stage — it is a
  post-launch visual/semantic sweep of the marketing site against the
  design.md §2 container pin (PR #204), not a W3 scope item; W3's own
  Figma self-QA (Dashboard frames) is unaffected by it.

**System-QA as-built notes (2026-07-19, `web/system-qa`):** the full-system
usability/accuracy/interaction pass over the W0–W3 app. Fixes of record:

- **Accuracy:** balance-sheet confirm treats a missing liabilities/equity
  side as 0 in the identity check (an absent-equity sheet used to confirm
  silently); `formatMoney` preserves the sign (a negative net month
  rendered positive); ledger recategorize (row/bulk/manual form) offers
  same-direction categories only; ratio traces resolve their `inputs` to
  `{id, canonical_key, amount}` (ids stay the audit pointer); the hero/tax
  marketing embeds and the A5 company donut now mirror seed.ts verbatim.
- **Rights:** `GET /account/purge` (200 `null` when none) + a settings
  mount probe — the grace banner/cancel now survive reloads.
- **Usability:** BulkActionBar floats at the viewport bottom; import jobs
  parked in staged review show a warn **Needs review** tag with staged
  counts (`ImportJobRowStatus` gains `needs-review`); the filing wizard
  defaults to PIT on personal orgs, surfaces the profile gate at data
  review, and calls out all-zero drafts; the AppNav auto-collapses to the
  64px rail below `md`; overview stat grids go 1-col at base; the hidden
  row-actions cluster is pointer-events-gated (it swallowed clicks).
- **MI fixes:** MI-14 NEW = `created_at ≥ now − 24h` (pure helper, the
  clock-skew `|diff|` hack retired); StatCard gains `deltaDirection`
  ("down-good" for expense-like metrics — color = goodness, sign/icon =
  direction); the A2 hero chips join the ScaledEmbed composition (they
  scaled independently and painted under the frame's stacking context).
- **Parity canon (org SKILL.md 2026-07-19):** marketing nav = Features ·
  Pricing · Docs · GitHub + ThemeToggle + Sign in CTA; footer = brand + 4
  columns (Product/Docs/Community/Legal) + verbatim legal bar; the
  apparule ThemeProvider contract ported (`expendit.theme`, pre-paint
  init script, toggle in marketing nav + dashboard chrome; the B9 control
  and `useThemeController` delegate to it). Playwright `parity.spec.ts`
  pins the canonical hrefs and theme persistence.
- **Polish:** token-true editorial 404 (both themes); pluralized count
  captions; the overview donut legend aggregates the tail into "Other";
  PeriodPicker triggers never wrap.
- **Mobile nav canon (org SKILL.md follow-up):** below `md` the four nav
  text links collapse into a hamburger disclosure (`aria-expanded`) whose
  panel carries the same links + ThemeToggle + Sign in — never
  display-none with no fallback; the 390w Playwright test walks every
  canonical destination through the menu.
- **Review-canon mock sweep:** (a) query/parse seams reject malformed
  input per their documented grammar — the transactions list 422s bad
  dates/amounts/enums/limits and unknown cursors (an `amount_min=abc`
  used to NaN-filter every row away), the ratios endpoints enforce the
  closed period grammar; (b) advertised controls observably change
  results — the bank-link "Auto-confirm clean syncs" toggle now commits
  clean syncs straight to the ledger vs staging them (it was never read),
  and image uploads 403 `consent_required` without the `ai_processing`
  consent record (flows/import.md §3; the Settings notification switches
  remain explicitly backend-deferred by copy); (c) derived-metric
  semantics under bucket changes were already correct (quarterly ×4
  annualization, actual day counts) and are now pinned by a regression
  test. The wizard's profile gate and the generate endpoint now share one
  predicate (`missingTaxIdentifiers`, models/tax.ts), and PIT drafts pick
  a plain calendar year (the FY#### year picker grammar stays
  statement-only) — both from the PR #209 Codex review.

Screen-state parity **[Directive 2026-07-18, carried from design.md §8.1]**:
every data-driven screen ships default, empty, and loading states — the
three-frame rule applies to the implementation exactly as it does to the
Figma templates, and the QA loop checks all three (B1/B2/B6/B6b/B7 have the
frames called out in pages.md; the rule covers every data-driven template).

The design.md §8.1 Stage-3 note carries over: the "composed at screen time"
assemblies (TxnTable full, staged-review table, ratio grid, filing wizard
steps) stay screen-level compositions in code too — feature components under
their W3 screens, not `components/ui/` modules.

## 3. Token mapping — design.md §2 → `web/src/design/tokens.css`

One custom property per Figma variable in the `expendit/tokens` collection
(design.md §7 — true Light/Dark modes); light values on `:root`, dark on
`[data-theme="dark"]`, `prefers-color-scheme` honored with manual override
(the B9 settings theme control sets `data-theme`).

| Group | Token names |
| --- | --- |
| Color | `--bg` · `--bg-editorial` (#0C0C0E in **both** modes — hero/dark marketing sections) · `--bg-elev` · `--border` · `--text` · `--text-2` · `--accent` (the Expendit orange) · `--on-accent` (white in both modes **[Decided 2026-07-16]** — primary/destructive labels bind here, never `--bg`) · `--income` · `--expense` · `--warn` · `--info` |
| Spacing | `--space-4` `--space-8` `--space-12` `--space-16` `--space-24` `--space-32` `--space-48` `--space-64` — the 4px-grid scale, no off-scale values |
| Radii | `--radius: 6px` (the product radius) · `--radius-full: 9999px` (avatars, dots, progress rings) |
| Motion | `--duration-fast: 120ms` · `--duration-base: 200ms` · `--duration-slow: 300ms` · `--duration-entrance: 250ms` · `--ease-standard: cubic-bezier(0.2, 0, 0, 1)` · `--ease-exit: cubic-bezier(0.4, 0, 1, 1)` |
| Z layers | `--z-base: 0` · `--z-sticky: 10` · `--z-dropdown: 20` · `--z-overlay: 30` · `--z-sheet: 40` · `--z-toast: 50` |

Notes: Expendit has no chart series-palette tokens — donut slices take the
registry category colors (B8, ColorSwatchPicker presets) and line charts
draw from `--income`/`--expense`/`--accent`. The Afrocentric line motif is
an asset at 4% opacity (dark editorial sections only), not a token.
Breakpoints need no mapping — the design.md §2 scale (sm 640 … 2xl 1536) is
Tailwind's default. Density row heights (compact 32 / comfortable 44) are
component constants per the shared-foundations product note, toggled per
table. **Tabular numerals** (`font-variant-numeric: tabular-nums`) apply
wherever the design.md §7 `tnum` note applies — MoneyCell, StatCard values,
every numeric table column; money formats `₦1,240,300.50` / `$…` with
currency from org settings.

## 4. Route map — pages.md Part A/B → app routes

pages.md names the Part B routes directly in its screen headers — the map
below restates them and resolves the drill-ins. Route shape
**[Decided 2026-07-18, route canon]** (user directive, canonical across the
ecosystem): `/` is the public home, `/signin` is the only auth route, and
**every app surface nests under `/dashboard/<area>`**. Detail views
open in the Inspector (deep-linkable `?record=`, MI-11), not routes —
tables never navigate away for a single record (design.md §2 layout rule);
the ⌘K palette (MI-1) is a global overlay, not a route.

| pages.md | Route | Screen |
| --- | --- | --- |
| Part A (A1–A11 + A4a/A5a/A8a/A10a/A10b) | `/` | Public home page (Brex-editorial) |
| flows/auth.md §1 | `/signin` | Single auth screen — GoogleAuthButton + legal links (the one X-1 auth screen; Stage-4 `signin` template) |
| B0 | `/onboarding` | First-run: org create (personal/company kind picker) + AI-consent sheet |
| B1 | `/dashboard` | Overview (StatCards, cash-flow chart, category donut, anomaly feed, latest txns) |
| B2 | `/dashboard/transactions` | Ledger (full TxnTable, filters, saved views, inline edit, inspector) |
| B3 | `/dashboard/imports` · `/dashboard/imports/{job_id}` | Import hub + staged-review job detail |
| B4 | `/dashboard/accounts` | Linked bank accounts (LinkAccountCard grid, MI-9 flow) |
| B5 | `/dashboard/reports` | Reports & downloads (artifact history, MI-14) |
| B6 | `/dashboard/company` · `/dashboard/company/statements/{id}` | Company financials — statements list + upload; mapping review & statement view drill-in |
| B6b | `/dashboard/company/ratios` | Ratio grid (RatioGauge groups, trends; traces open in the Inspector) |
| B7 | `/dashboard/taxes` | Tax center (profile, calendar, estimates with RemitToCard, filing history) |
| B7b | `/dashboard/taxes/file` | Filing wizard (MI-10) |
| B8 | `/dashboard/categories` | Categories (CRUD, color, merge) |
| B9 | `/dashboard/settings` | Settings incl. members/roles, org profile, rights & data screens (export-all, purge MI-15) |

Part C (mobile) has no web routes — it is a later phase (§8). Legacy
flat paths (`/expense`, `/income`, `/history`, `/import`, `/reports`,
`/categories`, `/settings`, and the password-era auth paths `/signup`,
`/forgot-password[/new-password]`, `/change-password`) carry no redirect
stubs — they 404 on the branded page (route canon, above): the only
routes are `/`, `/signin`, `/onboarding`, and `/dashboard/<area>`
(X-1, flows/auth.md §1).

## 5. TEST_MODE contract

`NEXT_PUBLIC_TEST_MODE=1` (build-time inlined, like all `NEXT_PUBLIC_*` —
[setup.md](setup.md)) switches exactly two seams; nothing else may branch
on it:

1. **Auth**: the `AuthProvider` resolves to `TestModeAuthProvider` —
   GoogleAuthButton navigates straight to `/dashboard` as the seeded test
   user (§6), no Firebase SDK loaded, no popup. The seeded user already has
   orgs + consent recorded, so boot lands on `/dashboard`, not B0; the B0
   first-run journey runs on the fresh-identity fixture (§6). The interface
   is identical to the future `FirebaseAuthProvider` (X-1 Google-only,
   bearer-token shape preserved — flows/auth.md §2), so backend integration
   swaps the provider, not the views.
2. **API client**: the models layer's base URL targets the in-app mock
   server — `/api/mock/v1/*` mirrors the `/api/v1/*` surface path-for-path
   (incl. the `X-Org-Id` context header), so repositories are identical in
   both modes except for the base URL.

Unset (or `0`) → real `FirebaseAuthProvider` + `NEXT_PUBLIC_BASE_URL`
(api/common). TEST_MODE is how Playwright runs in CI and how the app is
developed before the v1 backend consolidation lands.

## 6. Mock server & seed narrative

Route handlers under `web/src/app/api/mock/*` implement the api.md surface
the web consumes — the v1-consolidated current surface (§1→§2: one auth
path, JWT-scoped paths without `:userID`, envelope, cursor pagination) plus
the 2026-07-16 expansion (§5) — with the engineering.md §1 error envelope,
its snake_case code catalog, and the documented enum taxonomies (import-job
statuses, BANK_LINK states, mapping states, canonical keys, tax kinds).
Backed by one seeded in-memory store (module singleton, dev-persistent)
with full CRUD; contract types shared with `src/models/`.

| Group | Mocked endpoints (under `/api/mock/v1`) |
| --- | --- |
| Ledger | `/expense` · `/income` · `/category` CRUD + search (v1-consolidated: JWT-scoped, enveloped, cursor-paginated) |
| Dashboard aggregates | monthly income-vs-expense + category totals (the api.md §1 report endpoints, v1-consolidated) — B1 charts and StatCards; the anomaly feed reads anomaly-flagged transactions (flows/import.md §7 registry), no separate endpoint |
| Import | `POST /import/upload` (`202 {job_id}`, scripted processing → completed) · `GET /import/{job_id}` (polling) · `PUT /import/transaction/{id}/category` · `POST /import/{job_id}/confirm` · `DELETE /import/{job_id}` — every flows/import.md §3 failure-taxonomy code reproducible via designated fixture files |
| Reports & artifacts | `POST /reports` (`201 {artifact_id, signed_url, expires_at}` — mock-served file URL) · `GET /reports` (TTL'd history) |
| Data rights | `POST /account/export` (`202 {job_id}` → poll → signed_url) · `POST /account/purge` · `DELETE /account/purge` (grace; `409 purge_pending` on writes while open) |
| Consent | `GET/POST /consent` (`tos` / `privacy` / `ai_processing`) |
| Orgs | `POST/GET /orgs` · `PATCH /orgs/{id}` · member invite / role / remove · `X-Org-Id` honored on every group (absent = personal org) |
| Bank links | `POST /bank-links` · `PUT /bank-links/{id}/exchange` · `GET /bank-links` · `POST /bank-links/{id}/sync` (scripted MI-9 stepper: syncing with live txn counter → done → a `source: bank_sync` import job) · `PATCH` (pause/auto-confirm) · `DELETE ?purge=` — `/webhooks/bank` is server-to-server and not mocked; the sync scripting stands in |
| Statements | `POST /statements` (multipart → `202 processing`; manual JSON → `201` staged) · `GET/PATCH /statements/{id}/mapping` (AI-suggested keys with per-row `confidence`; low-confidence arrives unmapped, never guessed) · `POST /statements/{id}/confirm` (`422 mapping_identity_violation`, `unmapped_threshold_exceeded`) |
| Ratios | `POST /ratios/compute {period}` · `GET /ratios?period` · `GET /ratios/{key}/trace` |
| Taxes | `GET/PUT /tax/profile` · `GET /tax/estimates` (with the resolved remittance-authority block, tax-engine.md §5.5) · `POST /tax/filings` · `POST /tax/filings/{id}/generate` (`422 tax_identity_incomplete` when identifiers are missing) · `GET /tax/filings` — `/submit` is v2/provider-gated, not mocked |

**Seed narrative — the docs-coherent Figma dataset.** The store seeds the
design.md §8.3 synthetic demo datasets (freelancer / SME / company — the
same pool the Figma screens and the A5 demo strip render), so a TEST_MODE
boot looks like the designs:

- The signed-in test user owns a **personal org** (the freelancer dataset:
  a categorized NGN ledger with ✨ AI-suggested and confirmed CategoryChips,
  anomaly-flagged rows covering all four AnomalyBadge types, sources spread
  across csv/pdf/receipt/bank) and a **company org** (the SME/company
  datasets: members in every role, mapped statements across ≥2 periods so
  trends render).
- Import jobs in every ImportJobRow status (processing / completed /
  completed-empty / completed-bank / failed), plus one job parked in staged
  review with duplicates pre-flagged — the MI-3 counts ("Import 209 /
  discard 5 duplicates") render from seed.
- Bank links covering all five BANK_LINK states (pending / active /
  reauth_required / degraded / paused, data-model.md §6.2) — the re-auth
  Banner renders from seed.
- Statements: one confirmed per kind (balance_sheet / income_statement /
  cash_flow) and one staged mid-review with low-confidence unmapped rows
  plus a parser-missed row to add; ratio reports exercising every RatioGauge
  state (healthy / warning / critical / n-a) with benchmark bands and
  auditable traces (MI-8).
- Tax: the personal org's profile complete (`state_of_residence` resolving
  a State IRS, e.g. LIRS); the company org missing TIN/RC so the
  `422 tax_identity_incomplete` wizard block is demonstrable; calendar rows
  at T-30/T-7/T-1 escalation tints (MI-13); estimates with remit-to
  authority blocks; immutable filing history with stamped receipts.
- Report artifacts in every ReportArtifactRow state (generating / ready /
  NEW ≤24h / expired).
- A second, **fresh test identity** (no org, no consent) so the B0
  first-run + AI-consent journey is walkable end-to-end **[Proposed]**;
  empty states are otherwise asserted at unit level against an empty store.

## 7. Test strategy

| Layer | Tooling | Scope |
| --- | --- | --- |
| Unit | Vitest + Testing Library | every `components/ui/*` module (variant axes, states, both themes, reduced-motion fallbacks — count-ups render final values, gauges jump-cut, design.md §5); model/repository parsing incl. error-envelope handling; controller hooks |
| Integration | Vitest | mock handlers (envelope, pagination, enum taxonomies, 202-job lifecycles, mapping state machine — flows/statement-mapping.md §4 — and BANK_LINK transitions — data-model.md §6.2); controller ↔ mock-server flows (optimistic MI-11 inspector saves roll back on scripted failures) |
| E2E | Playwright, TEST_MODE against the mock server | the design.md §8.4 prototype journeys: **Core journey — sign in** (`/signin` → B0 → AI-consent → B1 → the navigation mesh + drill-ins: import review MI-2/3, bank-link stepper MI-9, statement mapping, ratio traces, filing wizard MI-10, rights MI-15) and **Marketing site** (Part A scroll + CTA handoff into `/signin`); plus the keyboard-first path — ⌘K palette (MI-1) and table keyboard nav (↑↓/enter/`e`, design.md §5) asserted explicitly (design principle 3); plus the §1 mobile-responsiveness sweep (390 + 768 across home and every dashboard route) and the floating-layer viewport clamps |
| CI | build-and-test workflow | lint + typecheck + Vitest + Playwright on every PR; X-6: merge-to-main never deploys |

The §8.4 rule that empty/loading/QA frames stay out of the prototype maps
here too: Playwright walks real user paths; empty/loading states are
asserted at unit/integration level (screen-state parity, §2). These rows
extend the engineering.md §4 table web-side; the release-tag E2E smoke
(signin → upload → review → confirm → report download, against sandbox in
release.yml) reuses the same Playwright journeys **[Proposed]**.

## 8. Legacy quarantine (dead-code policy)

The §1 policy, applied: **live paths carry zero dead code**, and
`web/src/legacy/` + the boundary gates are the standing mechanism.
`src/legacy/` is the quarantine tree — excluded from the TS build, lint,
and both test runners, and unrouted by construction (App Router is
filesystem-based; nothing under `src/legacy/` is a route). The gates hold
in CI (`scripts/check-boundaries.mjs` + the eslint
`no-restricted-imports` rules, both wired into `npm run lint`): **MUI
imports are legal only under `src/legacy/`**, and live code never imports
from it. `src/legacy/` is **currently empty** — the app runs entirely on
the token-layer registry (§1), and retired paths 404 on the branded page
rather than carrying redirect stubs forward (§4). `@mui/material` +
`@mui/x-data-grid` remain pinned in
package.json; dropping them is the outstanding cleanup **[Proposed]**.

The **mobile app is a later phase** (pages.md Part C): no `mobile/` tree
exists yet, and that phase gets its own implementation standard —
including its own application of the quarantine policy — when it opens.

## 9. Acceptance

- [ ] `tokens.css` matches design.md §2 / the `expendit/tokens` collection
      exactly, both themes; no raw hex in components (CI grep-gated)
- [ ] W0–W3 each closed by a Figma QA loop before merge; deviations landed
      in docs + the org SKILL.md
- [ ] TEST_MODE boots to `/dashboard` with the §6 seed rendering the
      Figma-coherent narrative (all three §8.3 datasets); no Firebase loaded
- [ ] Every mocked endpoint speaks the engineering.md §1 envelope with
      catalog codes; every referenced failure-taxonomy code producible from
      fixtures; contract types shared with models
- [ ] Views contain no fetch calls (MVC boundary enforced by review + lint
      rule)
- [ ] MUI imports absent outside `src/legacy/` (CI grep-gated);
      `src/legacy/` stays empty — removing `@mui/*` from package.json
      closes the migration **[Proposed]**
- [ ] Playwright §8.4 journeys green in CI, incl. the keyboard-first path
      (⌘K + table nav); merge-to-main never deploys (X-6)
