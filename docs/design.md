# Expendit — Design Language

> Reference feel: **brex.com** — editorial financial-grade polish: confident
> typography, dark hero surfaces, precise data UI, keyboard-first workflows.
> Markers: **[Directive]** = user-stated direction (2026-07-16), **[Proposed]**
> = ratifiable decision. Pages/screens in [pages.md](pages.md) reference the
> microinteractions here as `MI-n`.

## 1. Design principles

1. **Numbers are the product** — tabular numerals everywhere, right-aligned
   money columns, consistent decimal precision; charts austere, never
   decorative.
2. **Editorial confidence** — Brex's trick: marketing surfaces read like a
   finance magazine (huge serif-adjacent display type, generous whitespace,
   dark sections), while the app is dense, quiet, and fast.
3. **Keyboard-first ops** — the dashboard behaves like a tool: ⌘K palette,
   row-level shortcuts, inline edit. Mouse optional for the power path.
4. **Trust through disclosure** — sensitive states (bank links, AI processing,
   tax filings) always show *what's happening and why*, inline, not in a help
   center.

## 2. Foundations

### Color **[Proposed]**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | #FFFFFF | #0C0C0E | canvas |
| `bg-editorial` | #0C0C0E | #0C0C0E | hero/dark marketing sections (both themes) |
| `bg-elev` | #F7F7F8 | #17171A | cards, table headers |
| `border` | #E5E5E7 | #26262B | hairlines |
| `text` | #111113 | #F5F5F6 | primary |
| `text-2` | #6E6E76 | #A0A0A8 | secondary |
| `accent` | #F46A1F | #F46A1F | the Expendit orange (Brex-adjacent): primary CTAs, active nav, focus rings |
| `on-accent` | #FFFFFF | #FFFFFF | text/icons on accent & destructive fills — [Decided 2026-07-16] white in **both** modes; primary/destructive button labels rebind to it from `bg` |
| `income` | #1B7F4B | #34C77B | inflows, positive deltas |
| `expense` | #C6373C | #FF6B6E | outflows, negative deltas |
| `warn` | #B26A00 | #FFB020 | anomalies, tax deadlines |
| `info` | #2456D6 | #7DA2FF | AI/insight chips |
| Afrocentric pattern | 4% opacity line motif | — | dark editorial sections only |

### Type

- Display (marketing + dashboard page titles): **Inter Display** committed for
  v1 [Decided — no commercial-font procurement now]; revisit at brand pass. Hero sizes 56–88px,
  tight leading (Brex scale). The documented style ramp previously stopped at
  Hero/56; **Hero/88 Bold** (the A2 hero headline) is added to complete the
  56–88 scale [Decided 2026-07-16]. Inter Display remains unavailable in
  Figma — the Inter Bold tight-tracked fallback stands until the brand pass.
- UI/data: `Inter`; base 14, tables 13; **tabular figures always on for
  numeric columns**; money format `₦1,240,300.50` / `$…` with currency from
  org settings.
- Mono (`JetBrains Mono`): account numbers, statement IDs, code on home page.

### Layout

- Marketing: 12-col, max 1200px; alternating light/dark full-bleed sections.
  **Container pin [Decided 2026-07-19]:** every landing section lays its inner
  content in the single centered 1200px container (x 120–1320 on the 1440
  frame, min 24px gutters) — editorial bands stay full-bleed with their
  content aligned to it, and narrower blocks center within it. *As built:*
  the Figma `A — Home` frame was normalized to this rule on 2026-07-19 — the
  pillar row, all five feature deep-dive splits, the demo stats/charts/table,
  the how-it-works steps, the security columns, and the contribute dev-row
  previously implied phantom containers (872–1128px wide); 3-up card rows now
  share one 384px-card / 24px-gutter rhythm.
- Dashboard: left nav 240px (collapsible to 64px icon rail) · content
  max 1440px · right inspector panel (400px) slides in for detail views —
  tables never navigate away for a single record. **[Proposed]**
- Density toggle (comfortable/compact) on all tables.
- Radii 6px; shadows only on overlays; hairline-first like apparule.


### Shared foundations (ecosystem parity — identical across the three products)

| Foundation | Value |
| --- | --- |
| Spacing scale | 4px base grid: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` — no off-scale values; component padding uses the scale, not arbitrary numbers |
| Breakpoints | `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536` (Tailwind-aligned); mobile-first media queries |
| Motion durations | `fast 120ms · base 200ms · slow 300ms · entrance 250ms` — MI specs quote exact values, these are the defaults |
| Motion easing | standard `cubic-bezier(0.2, 0, 0, 1)`; exit `cubic-bezier(0.4, 0, 1, 1)`; springs only where an MI names one |
| Z-index layers | `base 0 · sticky 10 · dropdown 20 · overlay 30 · sheet/modal 40 · toast 50` — nothing outside these six |
| Iconography | **Lucide** (24px stroke default) everywhere; product-specific icons only as approved additions in the Figma Style Guide |
| Focus states | 2px accent ring, 2px offset, `:focus-visible` only — identical rule all products |
| Radii (product) | 6px |
| Product note | density toggle honors the compact row height 32px / comfortable 44px |

These rows are standardized in the org SKILL.md — a change here is an
ecosystem change, PR'd to all three design.md files together.

## 3. Component inventory

| Component | Anatomy | Notes |
| --- | --- | --- |
| `MoneyCell` | amount + direction color + currency | never colored for zero |
| `TxnTable` | virtualized rows: date · description · category chip · amount · anomaly badge · source icon (csv/pdf/receipt/bank) | row hover reveals actions (edit category, split, exclude); inline category edit |
| `CategoryChip` | color-dot + label; AI-assigned ones carry a subtle ✨ until confirmed | click → combobox |
| `AnomalyBadge` | type icon + severity tint | click → inspector explanation |
| `StatCard` | label · big tabular number · delta chip · sparkline | dashboard header row |
| `RatioGauge` | semicircle gauge + value + benchmark band | company ratios (pages.md B6) |
| `UploadDropzone` | drag target + file-type icons + progress ring per file | statement/records upload |
| `LinkAccountCard` | bank logo · masked account · sync status dot · last-synced | bank linking |
| `WizardShell` | left step rail + content + sticky summary right | imports, tax filing |
| `Inspector` | right slide-in panel, ESC closes | record detail everywhere |
| `CommandPalette` | ⌘K: navigate, actions ("upload statement", "new transaction", "new category"), recent records | Brex signature **[Proposed]** |
| `Toast/Banner` | toasts transient; banners persistent (bank re-auth needed, tax deadline) | |

## 4. Microinteraction catalog

| ID | Interaction | Spec |
| --- | --- | --- |
| MI-1 | **⌘K palette** | opens 120ms fade+4px rise; fuzzy match; ↑↓ + enter; recent-first; actions show their shortcut hints |
| MI-2 | **Upload lifecycle** | dropzone border animates to `accent` on drag-over; per-file progress ring; on parse start the ring morphs to an indeterminate AI-sparkle sweep; complete → ✓ pop + row count ("214 transactions found") |
| MI-3 | **Staged-review commit** | confirm button shows count ("Import 209 / discard 5 duplicates"); on commit, staged rows cascade-collapse into the ledger toast (240ms stagger ≤10 rows, then batch) |
| MI-4 | **Inline category edit** | click chip → combobox in-cell; enter commits with 80ms chip color crossfade; AI ✨ mark clears on human confirm; `e` on focused row opens it |
| MI-5 | **Anomaly pulse** | new anomalies pulse twice on first render, then rest; count in nav badge |
| MI-6 | **Row hover** | 60ms bg tint + action icons fade-in right-aligned; no layout shift (icons absolutely positioned) |
| MI-7 | **Number tick** | stat cards animate value changes with 300ms count-up (once per data refresh, not on scroll) |
| MI-8 | **Ratio gauge** | needle eases to value 600ms cubic; benchmark band fades in after; hover shows formula tooltip ("Current ratio = current assets ÷ current liabilities") |
| MI-9 | **Bank link flow** | provider modal (Mono/Plaid-style) inside `WizardShell`; status stepper: connect → consent → syncing (progress with live txn counter) → done; sync dot breathes while syncing |
| MI-10 | **Tax wizard** | step rail fills; each computed field shows a "how we got this" expander (line-item trace); final filing CTA requires typed confirmation of the period; success: stamped-✓ animation + receipt download |
| MI-11 | **Inspector slide** | 280ms ease-out; deep-linkable (`?record=`); ESC/overlay-click closes; edits save optimistically with field-level spinners |
| MI-12 | **Skeletons** | tables load header + 8 shimmer rows; charts load axis-first then series draw-in 400ms |
| MI-13 | **Deadline banners** | tax deadlines surface T-30/T-7/T-1 with escalating tint (info→warn); dismiss snoozes to next threshold |
| MI-14 | **Export** | report download button → inline progress → file-drop bounce on completion; artifact row appears in Reports history with NEW tag 24h |
| MI-15 | **Danger flows** | delete-all/purge: type-to-confirm + 5s countdown-armed button (design.md of record for USR-002) |
| MI-16 | **Empty states** | every table/chart: one-line + primary action ("Upload your first statement"); demo-data toggle on dashboard empty state (synthetic, clearly badged) |

## 5. Accessibility & motion

- `prefers-reduced-motion`: count-ups render final values; gauges jump-cut.
- All money deltas encode direction with icon + sign, never color alone.
- Tables: full keyboard nav (↑↓ rows, enter opens inspector, `e` edit
  category); focus rings `accent` 2px.
- Charts ship data-table toggles (screen-reader + export parity).

## 6. Platform parity map

| Surface | Now | Target |
| --- | --- | --- |
| Home (public) | full marketing page (needs Brex-style redesign) | pages.md Part A |
| Dashboard | full suite on MUI-era components | progressive restyle to this system, pages.md Part B |
| Mobile | — | later phase; ledger + receipt-capture first (pages.md Part C sketch) — ecosystem parity **[Directive]** |

## 7. Figma Style Guide (source of truth for tokens)

The design system lives in the product's Figma file on a dedicated **Style
Guide** page, backed by a variable collection **`expendit/tokens`** with **true Light and Dark modes** (migrated 2026-07-16 after the pro upgrade; the earlier light/dark-group workaround is retired — components bind one token and switch by mode). The collection also carries the foundations as variables: spacing scale, radii, durations, z-index. Every color token in §2 exists as a Figma
variable (scopes: frame/shape/text fills + strokes) so designs bind to tokens,
never raw hexes; the Style Guide page renders swatches (both modes), the type
scale, and status/accent samples. Token changes happen in Figma first, then
sync back into this document — the two must never diverge. The local text
styles (10, through Hero/88 Bold) shipped with the completion pass; the
rendered-page refresh below is the current sync debt.

Completion-pass additions (2026-07-16): `on-accent` (#FFFFFF in both modes,
§2) now exists in the `expendit/tokens` collection — primary/destructive
button labels rebind to it from `bg`. One manual step the plugin cannot do:
OpenType **tabular figures (`tnum`)** must be enabled by hand on numeric text
styles in the Figma UI — the plugin API cannot set font features — so every
numeric style (MoneyCell, StatCard values, table number columns) needs the
toggle set manually before it satisfies §2's "tabular figures always on".

Style Guide page refresh (excellence pass, 2026-07-17): the rendered page is
being trued up to the collection and this doc — adding the missing
`on-accent` swatch (the variable exists in both modes; the rendered swatch
list stops at the original 11), replacing the stale
`tokens: expendit/tokens (light/ + dark/ groups)` subtitle with the
true-modes wording, correcting the type-scale sample labels to the built
styles (the page shows "Title / 24 Bold" and "Heading / 20 Semi Bold" where
the built styles are **Heading/24 Semi Bold** and **Title/20 Semi Bold** —
names swapped, one weight wrong — and omits Hero/88, Body/14 Medium,
Table/13 Medium, and Mono/13 samples), and rendering the z-index layers in
Foundations (`z/base…z/toast` exist as variables, unrendered). The token
collection itself is already in sync with §2/§7 — the drift is page-render
only. Per the rule above, the page and this doc must never diverge.

## 8. Figma component build plan (design phase)

> Work order over the live `expendit/tokens` collection + Style Guide page
> (§7). Screens assemble from component instances only.

### 8.1 Build order

| Stage | Build | Unlocks |
| --- | --- | --- |
| 0 Foundations | type styles (§2 incl. editorial display sizes up to Hero/88) · Lucide icons (extended set — see note below) · table grid styles (compact 32 / comfortable 44 rows) | everything |
| 1 Atoms | Button, Input, MoneyCell, CategoryChip, AnomalyBadge, Toast/Banner + primitive kit (§8.2b): Checkbox, Radio, Switch, Tag/Badge, Tooltip, Avatar, Kbd, ProgressBar, Skeleton set | molecules |
| 2 Molecules | StatCard, TxnTableRow, UploadDropzone, LinkAccountCard, RatioGauge, Inspector chrome, CommandPalette, WizardShell chrome, FormRow, ManualStatementRow, RemitToCard, TaxCalendarRow + form/overlay kit (§8.2b): Select/Menu, DatePicker/PeriodPicker, Modal/Dialog chrome, SegmentedControl, Tabs, Accordion, WizardStep, StampedCheck, ColorSwatchPicker · app chrome (AppNav/NavItem, OrgSwitcher) · GoogleAuthButton · product rows (MemberRow, ImportJobRow, ReportArtifactRow, FilingHistoryRow) | tables + flows |
| 3 Assemblies | TxnTable (full), staged-review table, ratio grid, StatementView, filing wizard steps, EmptyState set + table chrome (TableHeader, BulkActionBar, StagedReviewHeader) · chart kit (Chart/Line, Chart/Donut) | screens |
| 4 Screen templates | dashboard, transactions, import review, accounts, company statements+ratios, tax center+wizard, settings/rights, signin (the single X-1 auth screen), reports (B5), categories (B8) | dashboard design |
| 5 Home page | A1–A11 Brex-editorial sections + marketing kit (§8.2b): MarketingNav, MarketingFooter, EditorialCard, CodeSnippet, ComparisonTable | landing redesign |

**Stage 0 icon set (extended 2026-07-16).** The parity audit fixes the Lucide
pull list beyond the icons already baked into built components: chevron-down ·
chevron-up · chevrons-up-down · chevron-right · chevron-left · plus · pencil ·
split · eye-off · trash-2 · copy · refresh-cw · pause · unlink · building-2 ·
calculator · tag · layout-dashboard · arrow-left-right · users · user ·
log-out · info · loader-circle · external-link · file-spreadsheet · image ·
camera (Part C, later phase). Brand glyphs — the Google 'G' for the X-1 auth
CTA, the GitHub mark (Lucide's `github` is deprecated), others as needed — are
approved additions per the shared-foundations iconography rule (§2), **not
Lucide**.

**Naming standards (canonical across the ecosystem) [Decided 2026-07-17].**
Component sets are PascalCase; variant property names are lowercase (`kind`,
`size`, `state`, …); icons are named `icon/<lucide-slug>` (e.g.
`icon/chevron-down`) and approved brand glyphs `icon/brand-<name>`
(`icon/brand-google`, `icon/brand-github`); the single X-1 auth CTA component
is named **GoogleAuthButton** in every product. Two renames land with this
pass (docs + build): `TxnTable row` → **TxnTableRow** (the one set name that
broke PascalCase) and `AuthGoogleCTA` → **GoogleAuthButton**.

**Stage-3 assemblies & canvas labels (2026-07-17).** The Stage-3 assemblies
without §8.2 contract rows — TxnTable (full), the staged-review table, the
ratio grid, and the filing wizard steps — are **composed at screen time**
from the built sets (TxnTableRow, TableHeader, BulkActionBar,
StagedReviewHeader, RatioGauge, WizardStep/WizardShell chrome); they are not,
and will not become, separate component sets. Note also that the
Components-page canvas section labels ("Stage 2b — Financial Platform Kit",
"Stage 3 — App Chrome & Primitives", "Stage 3b — Rows, Charts & Marketing")
are build-batch groupings that do **not** match the §8.1 stage numbering
above (docs Stage 3 = Assemblies); the "Mode test — Dark" and "About —
Component Library" frames on that page are QA/scaffolding artifacts, not
stages or contract rows.

**Screen-state rule [Directive 2026-07-18].** Every data-driven Stage-4
screen template ships **three frames**: **default** (populated), **empty**
(EmptyState + first-run copy; demo-data toggle where specced — MI-16), and
**loading** (Skeleton set, MI-12). pages.md calls the rule out on B1/B2/B6/B7;
it applies to every data-driven template in the Stage-4 row.

**Canvas hygiene [Directive 2026-07-18].** Design canvases carry **product
copy only**. Spec annotations — MI references, requirement IDs,
implementation notes — live in component descriptions and in these docs,
never on screens.

### 8.2 Variant matrices

> **Theme note (2026-07-17).** `theme ×2` in the rows here and in §8.2b
> (incl. Kbd's "on light/dark") is satisfied by the `expendit/tokens` true
> Light/Dark variable modes (§7) — components carry **no** theme variant
> axis; dark/light QA happens on the preview frames (the Components page's
> "Mode test — Dark" frame).
>
> **Theme parity (2026-07-19).** Runtime light/dark switching ships on the
> marketing nav, the dashboard chrome (AppNav) and in settings via the
> ThemeToggle component, per the cross-product "Marketing nav, footer &
> theme parity canon": apparule's `ThemeProvider` contract replicated —
> `data-theme` on `<html>`, persisted at localStorage key `expendit.theme`,
> falling back to the product design default. [Directive 2026-07-19]

| Component | Variants × states |
| --- | --- |
| Button | primary (accent) / quiet / destructive / danger-armed (countdown) · md/sm · default/pressed/disabled/loading · theme ×2 |
| Input | type: text / search · state: default / focus / filled / disabled / error |
| MoneyCell | direction: income / expense / zero · size: table / stat |
| CategoryChip | confirmed / AI-suggested (✨) / editing (combobox open) |
| AnomalyBadge | large_transaction / spending_spike / abnormal_category / duplicate_charge · inline / feed |
| StatCard | with/without delta chip · with/without sparkline · loading (as built: a single loading variant, delta + sparkline off — 5 of 8 combos, matching row intent) |
| TxnTableRow | default / hover (actions revealed) / selected / editing / staged-duplicate · density ×2 (renamed from `TxnTable row` — §8.1 naming standards) |
| UploadDropzone | idle / drag-over / per-file progress / AI-sweep / complete / error |
| LinkAccountCard | pending / active (breathing dot) / reauth_required / degraded / paused |
| RatioGauge | healthy / warning / critical / n-a ("missing input") · with/without benchmark band (as built: n-a ships band=off only — no benchmark band on missing input) |
| Inspector | record / anomaly-explain / trace ("how we got this") |
| Toast | kind: info / warn / error · transient (the toast half of §3's `Toast/Banner` atom; Banner below is the persistent half) |
| Banner | info / warn (deadline T-30/T-7/T-1 tints) / error (reauth) |
| FormRow | label + control + helper/error · state: default/focus/error/disabled (tax profile, org settings, manual entry) |
| RemitToCard | tax: pit/cit/vat · resolved authority (State IRS e.g. LIRS / FIRS) + amount due + deadline + payment-channel chip (tax-engine §"Remittance & authorities" registry) |
| StatementView | kind: balance_sheet / income_statement / cash_flow · derived rows flagged (formula note) · mapping-warning badges · period-selector header (pages.md B6 statement view) |
| ManualStatementRow | canonical-key combobox + amount input · state: default / error (identity check) — manual entry + mapping add-row |
| TaxCalendarRow | tax kind + period + due date + T-30/T-7/T-1 escalation tint (MI-13 data source) |
| EmptyState | transactions / imports / accounts / ratios / tax (each with demo-data toggle where specced) |

### 8.2b Completion pass (2026-07-16)

> Parity audit of pages.md (A1–A11, B1–B9, Part C), MI-1..16, and the flow
> docs against the built inventory: every §8.2 contract row is built, but the
> matrix itself was not exhaustive — the gaps cluster in app chrome,
> form/overlay primitives, table chrome, charts, and marketing components.
> Contract rows below, same conventions as §8.2; each row carries its need:
> **blocking** (a Stage-4/5 template cannot assemble without it) ·
> **important** (specced, assemblable later) · **nice-to-have**. `theme ×2`
> (and Kbd's "on light/dark") is delivered by token modes, not a variant
> axis — see the §8.2 theme note.

**App chrome**

| Component | Variants × states |
| --- | --- |
| AppNav / NavItem | **blocking** · item: default / hover / active / with-badge-count (MI-5) · group label · expanded 240px / collapsed 64px icon rail · org-switcher slot top · theme ×2 · ThemeToggle instance in the chrome (expanded footer + collapsed rail) [Directive 2026-07-19] |
| ThemeToggle | **blocking** · theme: light / dark (active cell tracks the applied theme) · lucide sun/moon icons · token-bound (`bg-elev`/`border`/`bg`, icon strokes → `text`) so one master renders in both modes · instances pinned in MarketingNav and AppNav chrome per the cross-product canon [Directive 2026-07-19] |
| OrgSwitcher | **blocking** · closed / open (menu) · org kind: personal / company · current + list rows · theme ×2 (as built: `open` is modeled on kind=company only — 3 of 4 combos; the open menu is the company exemplar) |
| MobileTabBar + MobileHeader | **nice-to-have** (Part C, later phase) · 5 tabs Home/Transactions/Capture/Reports/Settings · active/inactive · Capture accent · header: title + back |

**Form & overlay primitives**

| Component | Variants × states |
| --- | --- |
| Select / Menu | **blocking** · trigger: default / focus / open / disabled / error · option: default / hover / selected · md/sm · searchable-combobox variant (MI-4, canonical-key mapping — as built: combobox md-only) |
| DatePicker / PeriodPicker | **blocking** · modes: day / range / month / quarter / year (closed grammar) · open/closed · error · presets |
| Modal / Dialog chrome | **blocking** · sm/md/lg · header/body/footer slots · danger variant (type-to-confirm, MI-15) · sheet variant · overlay (z 40) |
| Tooltip | **blocking** · placement: top / bottom / left / right · text / formula (mono body, MI-8) |
| Tag / Badge | **blocking** · tint: neutral / info / warn / error / success / NEW-accent (MI-14) · text / count (9+ cap) · sm/md |
| Checkbox | **blocking** · unchecked / checked / indeterminate × default / hover / focus / disabled · with label |
| Radio | **important** · selected / unselected × default / hover / focus / disabled · with label+description (choice-card: unlink keep-or-purge, report format) |
| Switch / Toggle | **blocking** · on/off × default / hover / focus / disabled · with label/helper |
| SegmentedControl | **blocking** · preset: density (compact/comfortable) / direction (income/expense) / theme · state: default / disabled (disabled built for the density preset) — as-built shape 2026-07-17: selection is preset content; no per-segment hover/selected variant axis |
| Tabs | **blocking** · kind: underline (app) / pill (marketing) · items via **TabItem** sub-component set: default / hover / active / disabled (TabItem in build, 2026-07-17) |
| Accordion | **blocking** · closed / open · variant: "how we got this" line-item trace (mono formula body, MI-8/MI-10) |
| WizardStep | **blocking** · state: todo / current / done / error · orientation: vertical rail (MI-10) / horizontal status stepper (MI-9) · with-progress slot ("syncing" live txn counter) |
| ProgressBar | **important** · determinate / indeterminate · sm/md · label slot (live txn counter, MI-9; inline download progress, MI-14) |
| Skeleton set | **important** · table row shimmer (density ×2) · chart axis-only · text/stat block (MI-12) |
| Avatar | **important** · image / initials / icon fallback · xs/sm/md |
| Kbd | **nice-to-have** · single key / chord (⌘K) · on light/dark (MI-1 shortcut hints) |
| StampedCheck | **nice-to-have** · md/lg (MI-10 filing success, stamped receipts) — as built: stamp-in is motion, not a variant axis; noted in the component description |

**Table chrome**

| Component | Variants × states |
| --- | --- |
| TableHeader | **blocking** · density ×2 · sort: none / asc / desc (sort axis in build, 2026-07-17) · column alignment text / numeric-right set per instance (override, not a variant axis) · select-all checkbox slot · sticky |
| BulkActionBar | **blocking** · hidden / visible ("n selected" + re-categorize / export / clear) · slide-in |
| StagedReviewHeader | **blocking** · counts ("Import 209 / discard 5 duplicates") · state: reviewing / committing (MI-3 cascade) · warnings-banner slot |

**Charts**

| Component | Variants × states |
| --- | --- |
| Chart/Line | **blocking** · state: loading (axis-first, MI-12) / data / empty — as built: content kinds (12mo cash-flow / ratio + line-item trend) via instance overrides; the data-table toggle (§5) attaches at screen assembly, not in the set |
| Chart/Donut | **blocking** · state: loading / data / empty · legend: right / bottom / none (as built: `none` pairs with loading/empty) · center total |

**Product rows**

| Component | Variants × states |
| --- | --- |
| GoogleAuthButton | **blocking** · default / hover / pressed / loading / disabled · Google mark + "Continue with Google" (the single X-1 auth CTA) · theme ×2 (renamed from `AuthGoogleCTA` — §8.1 naming standards; canonical name in every product) |
| MappingReviewRow | **blocking** · state: suggested / confirmed / unmapped · source text → mono canonical-key chip + confidence Tag (✨ n% / Confirmed / Unmapped <60%) + tabular amount (in build 2026-07-18 — the B6 mapping-review screen, flows/statement-mapping.md) |
| MemberRow | **important** · avatar + name + email + role select + remove · default / hover / pending-invite / owner |
| ImportJobRow | **important** · status: processing / completed / completed-empty / completed-bank / failed · counts + anomalies-found — as built: the source axis folds into status (`completed-bank` = bank_sync; processing/failed render as upload-source) |
| ReportArtifactRow | **important** · kind icon + name + period + format · state: generating (inline progress) / ready / NEW (≤24h, MI-14) / expired (TTL) |
| FilingHistoryRow | **important** · tax kind + period + authority + deadline columns · stamped-✓ receipt download · immutable |
| ColorSwatchPicker | **nice-to-have** · preset swatch grid (category color, B8) — as built: a single component with internal swatch / swatch-hover / swatch-selected frames, not a variant set |

**Marketing (Stage 5)**

| Component | Variants × states |
| --- | --- |
| MarketingNav | **blocking** · on-dark (over hero) / dark-on-light (post-hero scroll, sticky) · 4 text links pinned to the cross-product canon: Features · Pricing · Docs (GitBook root) · GitHub — the GitHub item renders as a compact star badge (star glyph + neutral "Star" label; no count on canvas — the live star count is runtime behavior) · ThemeToggle instance · "Sign in" text link (`/signin`) + "Try Cloud" accent primary CTA · no Solutions dropdown [Revised 2026-07-19] |
| MarketingFooter | **blocking** · brand block (wordmark + tagline) + 4 link columns pinned to the cross-product canon — Product (Features · Pricing · Try Cloud · Self Host) · Docs (Docs · Quickstart · API reference · Self-host guide) · Community (GitHub · Discord · Roadmap · CueLABS) · Legal (Privacy · Terms · Status) — legal bar verbatim "© Cuesoft Inc. 2026. Expendit. CueLABS™ Division. MIT License." ("Cuesoft Inc." → cuesoft.io, "CueLABS™ Division" → cuelabs.cuesoft.io, "MIT License" → repo LICENSE) · "View Security Policy" CTA (repo SECURITY.md) · English language selector · dark editorial band in both themes [Directive 2026-07-19] |
| EditorialCard | **important** · pillar (A4) / community (A9) · default / hover (2px lift + accent underline draw) · light/dark section |
| CodeSnippet | **important** · Mono/13 block on dark · copy: idle / copied (✓ morph) |
| ComparisonTable | **important** · 2 columns (Cloud vs Self-host) · cell: check / x / text · per-column CTA footer row — as built 2026-07-18: the price row reads "Announced at GA" / "Free forever", captioned "Cloud pricing is announced at GA — self-hosting is free forever" |

> **Marketing accuracy (as built 2026-07-18).** The two as-built notes above
> are the whole pricing story: beyond the ComparisonTable price row and its
> caption, no marketing surface makes a pricing or plan claim.

> **As built [2026-07-18 QA loop].** Four adjustments from QA'ing the built
> screens while wiring the prototype (§8.4):
>
> - **CategoryChip** — the editing-state menu is absolutely positioned; the
>   open combobox no longer inflates the row height (the MI-6 no-layout-shift
>   rule now holds in the editing state too).
> - **Combobox contents** — the CategoryChip editing menu carries registry
>   categories only (the B8 category registry), no ad-hoc entries.
> - **WizardShell on B7b** — detached on the filing-wizard frames (pages.md
>   B7b: data-review + submit-confirm) in favor of anchored "how we got
>   this" trace rows.
> - **A5 demo strip** — carries a per-persona (Freelancer) internally
>   consistent dataset (the §8.3 synthetic-dataset work).

### 8.3 Design-prep needed from content

Synthetic demo datasets ×3 (freelancer / SME / company) for realistic
tables+charts; the Afrocentric line motif for dark editorial sections; the A2
hero device-frame visual and the A8 architecture mini-diagram (illustration
assets — parity audit 2026-07-16).

### 8.4 Prototype (2026-07-18 QA loop)

The built screens are wired into named click-through flows in the Figma
file. The conventions here are the prototype standard; the flows listed are
as built.

**Flows — named starting points, one per page.**

- Dashboard page — **"Core journey — sign in"**: `/signin` → onboarding
  (B0) → AI-consent sheet → B1 overview → the full navigation mesh (every
  left-nav section reachable from every other) plus drill-ins (inspectors,
  wizards, review screens).
- Home page — **"Marketing site"**: the A1–A11 scroll page, with the nav
  and hero CTAs wired **cross-page** into `/signin` via move-wire-restore
  (below) — the technique was first proven in this file.

**Wiring conventions.**

- Reactions are `ON_CLICK` → `NAVIGATE`.
- Transitions: `DISSOLVE` ~150–200ms for nav/tab switches; `SMART_ANIMATE`
  for pushes/backs (wizard steps, drill-in/return pairs); `AFTER_TIMEOUT`
  for async verification states (e.g. syncing → done, MI-9).
- Empty, loading, QA, and index frames stay **out** of the flow by design —
  the prototype walks the default (populated) frames only; state frames
  document the screen-state rule (§8.1), they are not navigation
  destinations.

**Reachability.** Verified by BFS over the reaction graph: every wired frame
is reachable from its flow's starting point, and there are no dead ends
besides intended terminals.

**Cross-page links — the move-wire-restore technique.** The Figma API
rejects creating a cross-page `NAVIGATE` reaction, but reactions persist if
the source frame is temporarily moved to the destination page, wired there,
and moved back. The Home → `/signin` CTAs are wired this way.
