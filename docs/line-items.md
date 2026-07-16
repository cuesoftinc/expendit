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

| Key | Examples |
| --- | --- |
| `cfo` | Net cash from operating activities |
| `cfi` | Net cash from investing activities |
| `cff` | Net cash from financing activities |
| `capex` | Purchase of PP&E |
| `net_change_in_cash` *(derived)* | |

## 4. Derivation & validation rules

- *(derived)* keys are computed when absent (`current_assets = cash +
  receivables + inventory + other`) and **cross-checked when present** — a
  reported total that differs from the component sum by >1% flags a
  `mapping_warning` on the statement (shown in the B6 review step).
- Every mapped statement must satisfy the accounting identity
  `total_assets ≈ total_liabilities + equity` (±1%) before `confirmed`.
- Amounts are stored in org currency, sign-normalized (assets/revenue
  positive; expenses/liabilities positive magnitudes with the key carrying
  semantics — no negative-by-convention ambiguity).
- Unmapped source rows can be parked as `unmapped` (excluded from ratios,
  listed in the review step) — but statements with >20% unmapped value by
  magnitude cannot be confirmed.

## 5. Ratio formulas (the auditable registry)

| Ratio | Formula (canonical keys) |
| --- | --- |
| Current ratio | `current_assets / current_liabilities` |
| Quick ratio | `(current_assets - inventory) / current_liabilities` |
| Cash ratio | `cash_and_equivalents / current_liabilities` |
| Debt-to-equity | `(short_term_debt + long_term_debt) / equity` |
| Debt ratio | `total_liabilities / total_assets` |
| Interest coverage | `operating_profit / interest_expense` |
| Gross margin | `gross_profit / revenue` |
| Operating margin | `operating_profit / revenue` |
| Net margin | `net_income / revenue` |
| ROA | `net_income / total_assets` |
| ROE | `net_income / equity` |
| Asset turnover | `revenue / total_assets` |
| Inventory turnover | `cogs / inventory` |
| Receivables days | `receivables / revenue × 365` |

Each computed `RATIO_REPORT` row persists the formula string + the exact
`LINE_ITEM` ids used (data-model.md §5), which is what the MI-8 "how we got
this" trace renders. Period-average denominators (e.g. average inventory)
are a **[Later]** refinement — v1 uses period-end values, disclosed in the
trace.
