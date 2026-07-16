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
| `income` | #1B7F4B | #34C77B | inflows, positive deltas |
| `expense` | #C6373C | #FF6B6E | outflows, negative deltas |
| `warn` | #B26A00 | #FFB020 | anomalies, tax deadlines |
| `info` | #2456D6 | #7DA2FF | AI/insight chips |
| Afrocentric pattern | 4% opacity line motif | — | dark editorial sections only |

### Type

- Display (marketing + dashboard page titles): editorial grotesk/serif from
  brand pass — interim `Söhne/Inter Display`-class. Hero sizes 56–88px,
  tight leading (Brex scale).
- UI/data: `Inter`; base 14, tables 13; **tabular figures always on for
  numeric columns**; money format `₦1,240,300.50` / `$…` with currency from
  org settings.
- Mono (`JetBrains Mono`): account numbers, statement IDs, code on home page.

### Layout

- Marketing: 12-col, max 1200px; alternating light/dark full-bleed sections.
- Dashboard: left nav 240px (collapsible to 64px icon rail) · content
  max 1440px · right inspector panel (400px) slides in for detail views —
  tables never navigate away for a single record. **[Proposed]**
- Density toggle (comfortable/compact) on all tables.
- Radii 6px; shadows only on overlays; hairline-first like apparule.

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
| `CommandPalette` | ⌘K: navigate, actions ("upload statement", "new category"), recent records | Brex signature **[Proposed]** |
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
Guide** page, backed by a variable collection **`expendit/tokens`** with
**Light** and **Dark** modes. Every color token in §2 exists as a Figma
variable (scopes: frame/shape/text fills + strokes) so designs bind to tokens,
never raw hexes; the Style Guide page renders swatches (both modes), the type
scale, and status/accent samples. Token changes happen in Figma first, then
sync back into this document — the two must never diverge. Type styles and
component samples are the next Style Guide iteration.
