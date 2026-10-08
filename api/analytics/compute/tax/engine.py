"""Tax estimates — tax-engine.md §2 (PIT), §3 (CIT), §4 (VAT), §5.5
(authority and calendar). Rules are data from the resolved rule set (the
params shape in tax-engine.md §1); every computed field carries its formula
and inputs (D5).

api/common supplies the rows each kind reads (a lookup); every figure,
treatment and banner is decided here.
"""

from datetime import date, timedelta

from compute.tax import authorities
from compute.tax.rulesets import RulesetBook, period_end, period_start


def _field(key: str, label: str, value: float, formula: str, inputs: list[str] | None = None,
           notes: list[str] | None = None) -> dict:
    return {"key": key, "label": label, "value": value, "formula": formula, "inputs": inputs or [], "notes": notes or []}


def _end_of_month(year: int, month: int) -> date:
    return date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)


def pit_from_bands(chargeable: float, bands: list[dict]) -> int:
    """Bands are cumulative upper bounds (`up_to_annual_ngn`, null = top)."""
    tax, previous = 0.0, 0.0
    for band in bands:
        cap = band["up_to_annual_ngn"] if band["up_to_annual_ngn"] is not None else float("inf")
        slice_ = min(chargeable, cap) - previous
        if slice_ > 0:
            tax += slice_ * band["rate"]
        if chargeable <= cap:
            break
        previous = cap
    return round(tax)


def _vat_of(amount: float, basis: str, rate: float) -> float:
    return amount * rate / (1 + rate) if basis == "inclusive" else amount * rate


def _in_progress_banner(period: str, today: date, fiscal_year_end: str) -> list[str]:
    if period_end(period, fiscal_year_end) >= today:
        return [f"{period} is in progress — the estimate updates as the ledger fills"]
    return []


def vat(request: dict, ruleset: dict, ctx: dict) -> dict:
    rules = ruleset["rules"]
    rate = rules["rate"]
    output = inputs = 0.0
    output_ids: list[str] = []
    input_ids: list[str] = []
    for txn in request["transactions"]:
        if txn["vat_treatment"] != "vatable":
            continue
        amount = _vat_of(abs(txn["amount"]), txn["vat_basis"], rate)
        if txn["direction"] == "income":
            output += amount
            output_ids.append(txn["id"])
        else:
            inputs += amount
            input_ids.append(txn["id"])
    # Input-VAT recovery [Decided v1]: fully recoverable when every supply is
    # vatable or zero-rated, otherwise pro-rata by vatable-revenue share.
    recovery = (
        "pro-rata apportionment by vatable-revenue share"
        if request.get("has_exempt_supplies")
        else "fully recoverable — all supplies vatable/zero-rated"
    )
    output_r, input_r = round(output), round(inputs)
    net = output_r - input_r
    pct = f"{rate * 100:g}/{100 + rate * 100:g}"
    due = (period_end(request["period"]) + timedelta(days=1)).replace(day=rules["filing"]["due_day"])

    banners = _in_progress_banner(request["period"], ctx["today"], ctx["fiscal_year_end"])
    threshold = rules.get("registration_threshold_ngn")
    turnover = request.get("trailing_12m_turnover")
    if threshold and turnover is not None and turnover < threshold:
        banners.append(f"Turnover is below the ₦{threshold / 1e6:g}m VAT registration threshold — registration may not be required")

    return {
        "kind": "vat",
        "period": request["period"],
        "amount_due": net,
        "due_date": due.isoformat(),
        "computed_fields": [
            _field("output_vat", "Output VAT", output_r, f"Σ vatable income × {pct} (inclusive basis)", output_ids,
                   ["ledger amounts are VAT-inclusive by default"]),
            _field("input_vat", "Recoverable input VAT", input_r, f"Σ vatable expenses × {pct} (inclusive basis)", input_ids, [recovery]),
            _field("net_vat", "Net VAT position", net, "output − recoverable input"),
        ],
        "authority": authorities.resolve("vat", ctx["taxpayer_kind"], None),
        "banners": banners,
    }


def cit(request: dict, ruleset: dict, ctx: dict) -> dict:
    rules = ruleset["rules"]
    items = request.get("line_items", {})  # canonical key -> {id, amount}

    def amount(key: str) -> float:
        return items[key]["amount"] if key in items else 0.0

    def ids(*keys: str) -> list[str]:
        return [items[k]["id"] for k in keys if k in items]

    assessable = amount("net_income") + amount("depreciation_amortization")
    turnover = amount("revenue")
    fixed_assets = amount("ppe") + amount("intangibles")
    levy_rule = rules["levy"]
    banners: list[str] = []
    if request["basis_period"] != request["period"]:
        banners.append(f"{request['period']} statements not yet uploaded — estimate based on {request['basis_period']} results")

    if "small_company" in rules:  # ng-cit-2026: small-company test
        small = rules["small_company"]
        turnover_max, assets_max = small["turnover_max_ngn"], small["fixed_assets_max_ngn"]
        is_small = turnover <= turnover_max and fixed_assets <= assets_max
        cit_rate = rules["rates"]["small" if is_small else "other"]
        test = f"small company: turnover ≤ ₦{turnover_max / 1e6:g}m AND fixed assets ≤ ₦{assets_max / 1e6:g}m"
        margin = rules.get("borderline_pct", 0.1)
        if abs(turnover - turnover_max) / turnover_max <= margin or abs(fixed_assets - assets_max) / assets_max <= margin:
            banners.append("Borderline small-company classification — review inputs")
    else:  # ng-cit-legacy: rate by turnover band
        bands = rules["turnover_bands"]
        band = next(b for b in bands if b["up_to_ngn"] is None or turnover <= b["up_to_ngn"])
        cit_rate = band["rate"]
        is_small = cit_rate == 0
        test = "rate by turnover band: " + " / ".join(
            f"{b['rate'] * 100:g}%" + (f" to ₦{b['up_to_ngn'] / 1e6:g}m" if b["up_to_ngn"] else " above") for b in bands
        )

    levy_rate = 0 if is_small and levy_rule.get("small_exempt") else levy_rule["rate"]
    cit_amount = round(assessable * cit_rate)
    levy = round(assessable * levy_rate)

    fy_end = period_end(request["period"], ctx["fiscal_year_end"])
    months = fy_end.month + rules["filing"]["months_after_year_end"]
    due = _end_of_month(fy_end.year + (months - 1) // 12, (months - 1) % 12 + 1)

    levy_name = levy_rule["label"].lower()
    classification_note = (
        f"small company — {cit_rate * 100:g}% CIT and {levy_rate * 100:g}% {levy_name}"
        if is_small
        else f"{cit_rate * 100:g}% CIT + {levy_rate * 100:g}% {levy_name} (turnover ₦{turnover / 1_000_000:.1f}m)"
    )
    return {
        "kind": "cit",
        "period": request["period"],
        "amount_due": cit_amount + levy,
        "due_date": due.isoformat(),
        "computed_fields": [
            _field("assessable_profit", "Assessable profit", assessable, "net_income + adjustments (depreciation add-back)",
                   ids("net_income", "depreciation_amortization"),
                   ["v1 exposes the adjustments worksheet with editable lines rather than computing capital allowances"]),
            _field("classification", "Classification", 0 if is_small else 1, test, ids("revenue", "ppe", "intangibles"),
                   [classification_note]),
            _field("cit", "Company income tax", cit_amount, f"assessable_profit × {cit_rate:g}"),
            _field(levy_rule["key"], levy_rule["label"], levy, f"assessable_profit × {levy_rate:g}", notes=levy_rule.get("notes", [])),
        ],
        "authority": authorities.resolve("cit", ctx["taxpayer_kind"], None),
        "banners": banners,
    }


def pit(request: dict, ruleset: dict, ctx: dict) -> dict:
    rules = ruleset["rules"]
    gross = exempt = 0.0
    input_ids: list[str] = []
    for txn in request["income"]:
        if txn["tax_treatment"] == "taxable_income":
            gross += abs(txn["amount"])
            input_ids.append(txn["id"])
        elif txn["tax_treatment"] == "exempt":
            exempt += abs(txn["amount"])  # reported, excluded from tax
        # "ignore": not income at all.

    deductions = sum(request.get("deductions", {}).values())
    relief_fields: list[dict] = []
    relief = 0.0
    if rent := rules.get("reliefs", {}).get("rent"):  # ng-pit-2026
        annual_rent = request.get("annual_rent") or 0
        relief = min(annual_rent * rent["rate"], rent["cap_ngn"])
        relief_fields.append(
            _field("rent_relief", "Rent relief", relief, f"{rent['rate'] * 100:g}% of annual rent, capped ₦{rent['cap_ngn']:,.0f}",
                   notes=[] if annual_rent else ["annual rent not supplied — add rent to claim relief"])
        )
    if cra := rules.get("cra"):  # ng-pit-legacy
        relief = max(cra["floor_ngn"], cra["pct_of_gross"] * gross) + cra["plus_pct"] * gross
        relief_fields.append(
            _field("cra", "Consolidated relief allowance", round(relief),
                   f"max(₦{cra['floor_ngn']:,.0f}, {cra['pct_of_gross'] * 100:g}% of gross) + {cra['plus_pct'] * 100:g}% of gross")
        )

    chargeable = max(0.0, gross - deductions - relief)
    tax = pit_from_bands(chargeable, rules["bands"])
    tax_notes: list[str] = []
    if minimum := rules.get("minimum_tax"):
        if gross < minimum["exempt_below_gross_ngn"]:
            tax, tax_notes = 0, [f"gross below ₦{minimum['exempt_below_gross_ngn']:,.0f} — exempt"]
        elif tax < gross * minimum["rate"]:
            tax, tax_notes = round(gross * minimum["rate"]), [f"minimum tax applies ({minimum['rate'] * 100:g}% of gross)"]

    return {
        "kind": "pit",
        "period": request["period"],
        "amount_due": tax,
        "due_date": f"{int(request['period']) + 1}-{rules['filing']['due_month_day']}",
        "computed_fields": [
            _field("gross_income", "Gross income", gross, "Σ income transactions (taxable categories)", input_ids,
                   [f"exempt income excluded: ₦{exempt:,.0f}"] if exempt else []),
            _field("deductions", "Allowed deductions", deductions, "pension + NHF + NHIS + life assurance",
                   notes=[] if deductions else ["no deduction inputs yet — add deductions"]),
            *relief_fields,
            _field("pit", "Personal income tax", tax, "bands over chargeable income", notes=tax_notes),
        ],
        "authority": authorities.resolve("pit", ctx["taxpayer_kind"], ctx.get("state_of_residence")),
        "banners": [
            "PIT shown before business-expense deductions — consult your accountant",
            f"Estimate covers {request['period']} year-to-date income",
        ],
    }


_ENGINES = {"pit": pit, "cit": cit, "vat": vat}


def estimate(inputs: dict, book: RulesetBook, for_filing: bool = False) -> list[dict]:
    """compute.requested kind=tax_estimate|filing. inputs: {today,
    taxpayer_kind, state_of_residence, fiscal_year_end, requests[]}."""
    ctx = {
        "today": date.fromisoformat(inputs["today"]),
        "taxpayer_kind": inputs["taxpayer_kind"],
        "state_of_residence": inputs.get("state_of_residence"),
        "fiscal_year_end": inputs.get("fiscal_year_end", "12-31"),
    }
    results = []
    for request in inputs["requests"]:
        kind = request["kind"]
        ruleset = book.resolve(kind, period_start(request["period"], ctx["fiscal_year_end"]))
        if for_filing and not ruleset["signed_off"]:
            raise PermissionError("ruleset_unsigned")
        result = _ENGINES[kind](request, ruleset, ctx)
        result["ruleset_id"] = ruleset["ruleset_id"]
        result["estimate_only"] = ruleset["estimate_only"]
        results.append(result)
    return results
