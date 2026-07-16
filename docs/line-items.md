# Expendit — Canonical Line-Item Vocabulary

> The closed mapping target for company financial statements (pages.md B6,
> data-model.md §5 `LINE_ITEM.canonical_key`). AI-suggested mappings and human
> corrections must both land on these keys — free-form keys are rejected, the
> same schema-as-boundary pattern used across the ecosystem. **[Proposed —
> ratify; extending the vocabulary is a docs PR, not a code change]**

## 1. Balance sheet

| Key | Statement label examples | Used by ratios |
| --- | --- | --- |
| `cash_and_equivalents` | Cash, bank balances, treasury bills < 90d | cash ratio |
| `receivables` | Trade debtors, accounts receivable | quick ratio, receivables days |
| `inventory` | Stock, finished goods, WIP | quick ratio (excluded), inventory turnover |
| `current_assets_other` | Prepayments, other current assets | current ratio |
| `current_assets` *(derived if absent)* | Total current assets | current/quick/cash ratios |
| `ppe` | Property, plant & equipment (net) | asset turnover |
| `intangibles` | Goodwill, software, licenses | — |
| `noncurrent_assets_other` | Investments, deferred tax assets | — |
| `total_assets` *(derived if absent)* | Total assets | debt ratio, ROA, asset turnover |
| `payables` | Trade creditors, accounts payable | current ratio |
| `short_term_debt` | Overdrafts, current portion of loans | current ratio, total debt |
| `current_liabilities_other` | Accruals, taxes payable | current ratio |
| `current_liabilities` *(derived)* | Total current liabilities | current/quick/cash ratios |
| `long_term_debt` | Loans, bonds, lease liabilities > 1y | debt-to-equity, total debt |
| `noncurrent_liabilities_other` | Deferred tax, provisions | — |
| `total_liabilities` *(derived)* | Total liabilities | debt ratio |
| `share_capital` | Issued capital, share premium | equity |
| `retained_earnings` | Accumulated profits/losses | equity |
| `equity` *(derived)* | Total shareholders' equity | debt-to-equity, ROE |

## 2. Income statement

| Key | Examples | Used by ratios |
| --- | --- | --- |
| `revenue` | Turnover, sales, fees earned | margins, turnovers |
| `cogs` | Cost of sales/goods sold | gross margin, inventory turnover |
| `gross_profit` *(derived)* | | gross margin |
| `opex` | Admin + selling + distribution expenses | operating margin |
| `depreciation_amortization` | D&A (if separate) | interest coverage (EBITDA variant) |
| `operating_profit` *(derived)* | EBIT, operating income | operating margin, interest coverage |
| `interest_expense` | Finance costs | interest coverage |
| `interest_income` | Investment/interest income | — |
| `tax_expense` | Income tax | net margin, CIT cross-check |
| `net_income` *(derived)* | Profit after tax | net margin, ROA, ROE |

## 3. Cash-flow statement

| Key | Examples | Used by |
| --- | --- | --- |
| `cfo` | Net cash from operating activities | operating cash-flow ratio, free cash flow, CFO-to-total-debt, runway |
| `cfi` | Net cash from investing activities | `net_change_in_cash` |
| `cff` | Net cash from financing activities | `net_change_in_cash` |
| `capex` | Purchase of PP&E | free cash flow |
| `net_change_in_cash` *(derived)* | | — |

## 4. Derivation & validation rules

- *(derived)* keys compute when absent and **cross-check when present** — a
  reported total differing from the component sum by >1% flags a
  `mapping_warning` on the statement (B6 review step). Full derivation table:

| Derived key | Formula |
| --- | --- |
| `current_assets` | `cash_and_equivalents + receivables + inventory + current_assets_other` |
| `total_assets` | `current_assets + ppe + intangibles + noncurrent_assets_other` |
| `current_liabilities` | `payables + short_term_debt + current_liabilities_other` |
| `total_liabilities` | `current_liabilities + long_term_debt + noncurrent_liabilities_other` |
| `equity` | `share_capital + retained_earnings` |
| `gross_profit` | `revenue − cogs` |
| `operating_profit` | `gross_profit − opex − depreciation_amortization` — **D&A rule: `opex` EXCLUDES D&A by definition**; if the source statement buries D&A inside opex and reports no separate line, map the combined figure to `opex` and leave `depreciation_amortization` absent (interest-coverage trace then notes "EBIT basis, D&A not separable") |
| `net_income` | `operating_profit + interest_income − interest_expense − tax_expense` |
| `net_change_in_cash` | `cfo + cfi + cff` |
- Every mapped statement must satisfy the accounting identity
  `total_assets ≈ total_liabilities + equity` (±1%) before `confirmed`.
- Amounts are stored in org currency, sign-normalized (assets/revenue
  positive; expenses/liabilities positive magnitudes with the key carrying
  semantics — no negative-by-convention ambiguity). **Exception: cash-flow
  keys (`cfo`, `cfi`, `cff`, `capex`, `net_change_in_cash`) are signed** —
  inflow positive, outflow negative, as reported.
- **Currency (E-6)**: statements denominated in a currency other than the
  org's are rejected at upload (`422 currency_mismatch`) — no FX in v1;
  detection from the mapping review's currency field (user-confirmed).
- Unmapped source rows can be parked as `unmapped` (excluded from ratios,
  listed in the review step) — but statements with >20% unmapped value by
  magnitude cannot be confirmed (`422 unmapped_threshold_exceeded`); identity
  failure at confirm returns `422 mapping_identity_violation` (these codes
  originate here; engineering.md §1 catalogs them).

## 5. Ratio & metric formulas + benchmark bands (the auditable registry)

Benchmark bands ship as **constants in this registry [Decided v1]**
(pages.md B6), labeled "general guidance" in the UI — industry-specific
benchmarks are a later data product; changing a band is a docs PR, exactly
like extending the vocabulary. `Direction` feeds gauge/delta coloring:
`higher` = higher is better, `lower` = lower is better, `band` = healthy is
a range.

| Metric | Formula (canonical keys) | Healthy band (v1 general guidance) | Direction |
| --- | --- | --- | --- |
| Current ratio | `current_assets / current_liabilities` | healthy 1.5–3.0 · warning 1.0–1.5 or >3.0 · critical <1.0 | band |
| Quick ratio | `(current_assets - inventory) / current_liabilities` | healthy ≥1.0 · warning 0.5–1.0 · critical <0.5 | higher |
| Cash ratio | `cash_and_equivalents / current_liabilities` | healthy ≥0.2 · warning 0.1–0.2 · critical <0.1 | higher |
| Working capital | `current_assets − current_liabilities` | no band — currency value (StatCard/MoneyCell, not RatioGauge) | higher |
| Debt-to-equity | `(short_term_debt + long_term_debt) / equity` | healthy <1.0 · warning 1.0–2.0 · critical >2.0 | lower |
| Debt ratio | `total_liabilities / total_assets` | healthy <0.5 · warning 0.5–0.7 · critical >0.7 | lower |
| Interest coverage | `operating_profit / interest_expense` | healthy ≥3.0 · warning 1.5–3.0 · critical <1.5 | higher |
| Interest coverage (EBITDA) | `(operating_profit + depreciation_amortization) / interest_expense` | as the EBIT variant | higher |
| Gross margin | `gross_profit / revenue` | no band — trend-only (industry-sensitive) | higher |
| Operating margin | `operating_profit / revenue` | no band — trend-only | higher |
| Net margin | `net_income / revenue` | no band — trend-only | higher |
| ROA | `net_income / total_assets` | no band — trend-only | higher |
| ROE | `net_income / equity` | no band — trend-only | higher |
| Asset turnover | `revenue / total_assets` | no band — trend-only | higher |
| Inventory turnover | `cogs / inventory` | no band — trend-only | higher |
| Receivables days | `receivables / revenue × 365` | no band — trend-only | lower |
| Operating cash-flow ratio | `cfo / current_liabilities` | no band — trend-only | higher |
| Free cash flow | `cfo + capex` (as-reported; see CF convention below) | no band — currency value | higher |
| CFO-to-total-debt | `cfo / (short_term_debt + long_term_debt)` | no band — trend-only | higher |
| Revenue growth | `(revenue_t − revenue_prev) / revenue_prev` | no band | higher |
| Net-income growth | `(net_income_t − net_income_prev) / net_income_prev` | no band | higher |
| Runway (months) | `cash_and_equivalents / avg monthly net cash burn` | no band — value; "n/a — cash-flow positive" when not burning | higher |

**EBITDA-variant rule:** Interest coverage (EBITDA) is shown only when
`depreciation_amortization` was separately mapped; otherwise it is omitted
and the EBIT-basis trace note (§4) applies.

**Growth-metric rules:** consecutive same-kind periods only (Q-over-Q,
H-over-H, or FY-over-FY — never mixed granularity); "n/a — no prior period"
when absent; when the prior value is ≤ 0 (e.g. loss to profit), the
percentage is suppressed and the trace shows the absolute change with a
"sign change" note.

**Cash-flow convention:** `cfo`/`capex` are signed (§4 exception) — free
cash flow computes `cfo + capex` as-reported (capex reported negative),
i.e. CFO minus the capex outflow magnitude.

**Runway (company orgs, pages.md B1 StatCard):** `burn` = trailing-3-period
average net cash outflow — from `cfo` when confirmed cash-flow statements
exist, else from the ledger's monthly net cash flow (income − expenses);
renders "n/a — cash-flow positive" when not burning and "n/a — insufficient
history" under 3 periods; the trace names the burn source (statement vs
ledger).

Each computed `RATIO_REPORT` row persists the formula string + the exact
`LINE_ITEM` ids used (data-model.md §5) — the MI-8 trace. Period-average
denominators are **[Later]**; v1 uses period-end values, disclosed in the
trace.

**Period normalization [Decided]:** flow figures (revenue, cogs, net_income,
interest) annualize by period length before mixed-ratio computation —
quarterly ×4, half-year ×2, FY ×1 — and the trace shows the annualization
factor. Receivables-days uses the period's actual day count (`× days`, not a
hardcoded 365). **Statement pairing:** ratios mixing BS and IS require
statements of the SAME `period` value; absent a match, the ratio renders
"n/a — missing {kind} for {period}".

**Degenerate denominators [Decided]:** denominator = 0 or absent → "n/a"
with a trace note (never ∞/error): interest coverage with no
`interest_expense` → "n/a — no interest expense"; inventory turnover with no
`inventory` → "n/a"; ROE with `equity ≤ 0` → shown as "negative equity"
badge instead of a number (a real signal, not hidden).

## 6. Period grammar **[Proposed — ratify]**

`FIN_STATEMENT.period` (data-model.md §5) is a **closed grammar**, selected
from a picker at upload/manual entry — never free text — because statement
pairing ("SAME `period` value", §5) and uniqueness (`409 period_exists`,
flows/statement-mapping.md §3) both key on the exact string:

| Token | Meaning | Annualization (§5) |
| --- | --- | --- |
| `YYYY-Qn` (e.g. `2026-Q2`) | calendar quarter | ×4 |
| `YYYY-H1` / `YYYY-H2` | calendar half-year | ×2 |
| `FYYYYY` (e.g. `FY2025`) | the org's fiscal year: the 12 months **ending on `ORG.fiscal_year_end`** (MM-DD, default `12-31`) in that year — a June-year-end company's FY2025 runs 2024-07-01 → 2025-06-30 | ×1 |

Monthly statements (`YYYY-MM`) are **not accepted in v1** — the token is
reserved; aggregate monthly management accounts to a quarter. The FY start
date derived here feeds tax-engine.md §1 rule-set resolution ("by the
period's start date").
