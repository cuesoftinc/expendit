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
  kind: pit | cit | vat   // PAYE, WHT & state levies: out of v1 scope [Decided] — this field is their extension point
  effective_from / effective_to
  params: { bands: […], reliefs: {…}, rates: {…}, filing: {…} }
  signoff: { by, date, reference }   // professional review gate
}
```

Period → rule-set resolution is by the period's start date. FY2025 personal
filings resolve `ng-pit-legacy`; 2026 onward resolve `ng-pit-2026`.
`FYYYYY` statement periods derive their start date from the org's
`fiscal_year_end` (data-model.md §5, default 12-31; grammar in
line-items.md §6) — a June-year-end company's FY2025 starts 2024-07-01.
**Authority resolution** (where the liability is payable) is separate from
rule-set resolution: it reads `TAX_PROFILE.state_of_residence` (individuals)
/ `ORG.registered_address.state` (companies) — see §5.5.

## 2. PIT (personal income tax)

### 2.1 `ng-pit-2026` (Nigeria Tax Act 2025, from 2026-01-01)

Chargeable income = gross income − allowed deductions − **rent relief**
(20% of annual rent, capped ₦500,000, rent user-supplied with a prompt).
The legacy Consolidated Relief Allowance is abolished in this regime.

**Allowed deductions (`ng-pit-2026`, closed list — each an explicit input):**

| Deduction | Source | Cap/rule |
| --- | --- | --- |
| Pension contributions (PRA-compliant) | ledger category `pension` OR user input | statutory rate, no artificial cap |
| National Housing Fund | ledger category `nhf` OR user input | 2.5% of basic (user confirms) |
| NHIS/health insurance premiums | ledger category `health_insurance` OR user input | as contributed |
| Life assurance premiums | user input | as paid |
| Rent relief | user input (annual rent) | 20% of rent, cap ₦500,000 |

Each deduction line appears in the trace with its source (category sum vs
user input). Absent inputs default to 0 with a "add deductions" prompt.
**Business-expense deduction for freelancers/SMEs is NOT computed in v1** —
estimates are gross-income-based; the estimate banner states this limitation
explicitly ("PIT shown before business-expense deductions — consult your
accountant") **[Decided v1 limitation]**.

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
of gross where computed tax is lower — **exempt below ₦30,000/yr gross
(national-minimum-wage exemption) [rule-set param]**.

Rule-set `params` shape (all rule sets):

```json
{
  "bands": [{"up_to_annual_ngn": 800000, "rate": 0.0}, {"up_to_annual_ngn": 3000000, "rate": 0.15}],
  "reliefs": {"rent": {"rate": 0.20, "cap_ngn": 500000}},
  "deductions": ["pension", "nhf", "nhis", "life_assurance"],
  "minimum_tax": {"rate": 0.01, "exempt_below_gross_ngn": 30000}
}
```

### 2.3 Inputs from the ledger

Gross income = sum of `income` transactions in period, **excluding**
categories flagged non-taxable (capital transfers between own accounts,
loan principal received, gifts — a per-category `tax_treatment` attribute,
user-reviewable in Categories): `taxable_income` (in gross, taxed) ·
`exempt` (**reported in the trace as exempt income, excluded from tax**) ·
`ignore` (**not income at all — excluded from gross and from the trace**,
e.g. self-transfers). Every
figure in the wizard traces to the transaction list behind it.

## 3. CIT (companies)

### `ng-cit-2026`

| Classification | Test | Rate |
| --- | --- | --- |
| Small company | turnover ≤ ₦100m AND fixed assets ≤ ₦250m | 0% CIT **and 0% development levy** (levy follows the CIT exemption) **[rule-set param]** |
| Other | — | 30% + **4% development levy on assessable profits** (consolidates the former education tax etc.) |

Inputs come from the mapped statements (line-items.md): assessable profit
starts from `net_income` with an adjustments worksheet (disallowables:
depreciation add-back vs capital allowances — **v1 exposes the worksheet
with editable adjustment lines rather than pretending to compute capital
allowances**; each line requires a label and traces into the filing).
Classification inputs (`revenue`, `ppe`+`intangibles`) come from mapped
line items; borderline (±10%) classification prompts review.

`ng-cit-legacy`: 0/20/30% by the 25m/100m turnover thresholds + TET 3% **of assessable profits** (same base as CIT).

## 4. VAT

`ng-vat-2026`: rate **7.5%**. **Amount convention [Decided]: ledger amounts
are VAT-inclusive by default** — output VAT = amount × 7.5/107.5; a
per-category `vat_basis: inclusive | exclusive` override exists for orgs that
book net amounts (exclusive ⇒ amount × 7.5%). Output VAT from `vatable`
income categories, input VAT from `vatable` expense categories (per-category
`vat_treatment`: `vatable | zero_rated | exempt`). **Input-VAT recovery
[Decided v1]:** fully recoverable when all supplies are vatable/zero-rated;
orgs with exempt supplies get pro-rata apportionment by vatable-revenue share,
shown in the trace. Net position = output − recoverable input;
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
| **Filing draft** (TAX-002) | requires: full-period data, confirmed category treatments, signed-off rule set, **tax identity complete** (TIN; + RC number and registered address for company profiles; state of residence for individuals); generates filing-ready documents (PIT self-assessment pack, CIT computation + capital-allowance worksheet, VAT return schedule, **plus a remittance sheet per filing**: authority name/code from the §5.5 registry, amount due, period, deadline from the §5.5 calendar, payment channel(s), taxpayer identifiers TIN/RC) with the full trace appendix — TIN/RC/registered address are stamped on every generated form |
| Direct e-filing (TAX-003) | later; per-channel integration decisions |

Every generated figure stores `{value, ruleset_id, inputs: [transaction/line-item ids], formula}` — the immutable trace that makes an audit answerable.

Error codes per wizard step (engineering.md §1 catalog): draft creation →
`422 period_incomplete` (missing months) · generate → `409 ruleset_unsigned`
(no professional sign-off), `422 mapping_unconfirmed` (CIT draft with
staged statements) and `422 tax_identity_incomplete` (missing TIN; RC
number/registered address for companies; state of residence for
individuals) · submit (v2) → provider-specific.

## 5.5 Remittance & authorities

The "where to pay" half of the contract (pages.md B7 "remit to" lines,
RemitToCard). Same governing rule as the rate tables: **authorities and
filing deadlines are versioned rules-as-data**, sign-off-gated, so a
registry change is a config release, not code.

### Authority resolution (rules-as-data)

| Tax kind | Taxpayer | Authority | Resolved from |
| --- | --- | --- | --- |
| `pit` | individual (NG resident) | **State IRS** of the state of residence (e.g. `NG-LA` → LIRS) | `TAX_PROFILE.state_of_residence` |
| `pit` | non-resident / FCT / armed-forces & foreign-service edge cases | **FIRS** | rule-set param; edge cases prompt review |
| `cit` + development levy | company | **FIRS** | — |
| `vat` | all | **FIRS** | — |

Authority registry entries carry `{code, name, payment_channels,
reference_format}` — e.g. FIRS: TaxPro-Max portal + Remita; each State IRS:
its e-tax portal (LIRS eTax for Lagos) — versioned like `TAX_RULESET` with
the same professional sign-off gate. Estimates and filings **persist the
resolved authority** (`TAX_ESTIMATE.authority`, `TAX_FILING.authority` —
data-model.md §5) so historical records survive registry changes; API
responses include the authority block (api.md §5).

### Filing calendar (rule-set params)

| Kind | Frequency | Due rule |
| --- | --- | --- |
| `pit` annual return | annual | `03-31` — 31 March following the year of assessment |
| `cit` (+ development levy) | annual | `fy_end+6m` — within 6 months of the accounting year end (`ORG.fiscal_year_end`) |
| `vat` | monthly | `next_month_21` — the 21st of the following month (§4) |

Encoded as rule-set params (`filing: {frequency: annual|monthly, due_rule}`),
versioned and sign-off-gated like the rate tables — the data source for the
B7 tax calendar and the MI-13 T-30/T-7/T-1 deadline banners. ⚠️ Flagged for
professional review with the rest of the rule set.

## 6. Acceptance

- [ ] Same ledger + different periods resolves different rule sets correctly
- [ ] PIT-2026 golden tests: 0 tax at ≤800k; spot values at band edges (3m, 12m, 25m, 50m)
- [ ] Rent relief caps at 500k; absent rent input → relief 0 with prompt
- [ ] CIT small-company test uses mapped line items; borderline prompts review
- [ ] VAT net position reconciles to category-filtered transaction sums
- [ ] No filing document generates from an unsigned rule set
- [ ] No filing document generates with an incomplete tax identity
      (`422 tax_identity_incomplete`)
- [ ] Authority resolution: Lagos-resident individual PIT → LIRS; company
      CIT/VAT → FIRS; the resolved authority persists on estimate and filing
