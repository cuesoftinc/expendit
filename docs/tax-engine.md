# Expendit — Tax Engine Contract (Nigeria)

> Implements E-2 (Nigeria-first) at the computation level. **Governing design
> rule: tax rules are versioned data, not code** — the engine executes rule
> sets selected by tax period, so law changes are config releases with
> effective dates, and every computed field carries its rule-set version in
> its trace (pages.md B7 "how we got this").
>
> ⚠️ **Professional review gate:** the tables below encode the rules as
> understood at writing (incl. the Nigeria Tax Act 2025 regime effective
> 2026-01-01). A licensed tax practitioner must sign off each rule set
> before the filing wizard leaves "estimate" labeling. This is a launch
> checklist item, not a formality.

## 1. Rule-set mechanism

```
TAX_RULESET {
  id: "ng-pit-2026" | "ng-pit-legacy" | "ng-cit-2026" | "ng-vat-2026" | …
  jurisdiction: "NG"
  kind: pit | cit | vat
  effective_from / effective_to
  params: { bands: […], reliefs: {…}, rates: {…} }
  signoff: { by, date, reference }   // professional review gate
}
```

Period → rule-set resolution is by the period's start date. FY2025 personal
filings resolve `ng-pit-legacy`; 2026 onward resolve `ng-pit-2026`.

## 2. PIT (personal income tax)

### 2.1 `ng-pit-2026` (Nigeria Tax Act 2025, from 2026-01-01)

Chargeable income = gross income − allowed deductions − **rent relief**
(20% of annual rent, capped ₦500,000, where rent is user-supplied with a
prompt). The legacy Consolidated Relief Allowance is abolished in this
regime.

| Band (annual, ₦) | Rate |
| --- | --- |
| first 800,000 | 0% |
| next 2,200,000 (to 3m) | 15% |
| next 9,000,000 (to 12m) | 18% |
| next 13,000,000 (to 25m) | 21% |
| next 25,000,000 (to 50m) | 23% |
| above 50,000,000 | 25% |

### 2.2 `ng-pit-legacy` (pre-2026 periods)

CRA = max(₦200,000, 1% of gross) + 20% of gross; bands
7/11/15/19/21/24% over 300k/300k/500k/500k/1.6m/above-3.2m; minimum tax 1%
of gross where computed tax is lower (with low-income exemption).

### 2.3 Inputs from the ledger

Gross income = sum of `income` transactions in period, **excluding**
categories flagged non-taxable (capital transfers between own accounts,
loan principal received, gifts — a per-category `tax_treatment` attribute:
`taxable_income | exempt | ignore`, user-reviewable in Categories). Every
figure in the wizard traces to the transaction list behind it.

## 3. CIT (companies)

### `ng-cit-2026`

| Classification | Test | Rate |
| --- | --- | --- |
| Small company | turnover ≤ ₦100m AND fixed assets ≤ ₦250m | 0% |
| Other | — | 30% + **4% development levy** on assessable profits (consolidates the former education tax etc.) |

Inputs come from the mapped statements (line-items.md): assessable profit
starts from `net_income` with an adjustments worksheet (disallowables:
depreciation add-back vs capital allowances — **v1 exposes the worksheet
with editable adjustment lines rather than pretending to compute capital
allowances**; each line requires a label and traces into the filing).
Classification inputs (`revenue`, `ppe`+`intangibles`) come from mapped
line items; borderline (±10%) classification prompts review.

`ng-cit-legacy`: 0/20/30% by the 25m/100m turnover thresholds + TET 3%.

## 4. VAT

`ng-vat-2026`: rate **7.5%**; output VAT from `vatable` income categories,
input VAT from `vatable` expense categories (per-category `vat_treatment`:
`vatable | zero_rated | exempt`); net position = output − recoverable input;
monthly period with filing due the **21st** of the following month (drives
the MI-13 deadline banners). Registration-threshold guidance (turnover ≥
₦25m) surfaces as a banner for below-threshold orgs, not a block.

Zero-rated/exempt category defaults (basic food, medical, educational
materials, exports — expanded under the 2025 Act) ship as the rule set's
category-mapping suggestions; the user's category → treatment mapping is
theirs to confirm.

## 5. Estimation vs filing

| Mode | Behaviour |
| --- | --- |
| **Estimate** (always available) | computed from whatever data exists; banner lists gaps ("3 months of statements missing") |
| **Filing draft** (TAX-002) | requires: full-period data, confirmed category treatments, signed-off rule set; generates filing-ready documents (PIT self-assessment pack, CIT computation + capital-allowance worksheet, VAT return schedule) with the full trace appendix |
| Direct e-filing (TAX-003) | later; per-channel integration decisions |

Every generated figure stores `{value, ruleset_id, inputs: [transaction/line-item ids], formula}` — the immutable trace that makes an audit answerable.

## 6. Acceptance

- [ ] Same ledger + different periods resolves different rule sets correctly
- [ ] PIT-2026 golden tests: 0 tax at ≤800k; spot values at band edges (3m, 12m, 25m, 50m)
- [ ] Rent relief caps at 500k; absent rent input → relief 0 with prompt
- [ ] CIT small-company test uses mapped line items; borderline prompts review
- [ ] VAT net position reconciles to category-filtered transaction sums
- [ ] No filing document generates from an unsigned rule set
