"""Ratio engine — line-items.md §5 (S-7).

Pure: api/common supplies the confirmed line items for the period and the
previous same-kind period, plus the ledger's trailing monthly nets for the
runway burn rule, in compute.requested. Every result carries its formula and
the exact line-item inputs (D5).
"""

from collections.abc import Callable

from compute.registry.line_items import KIND_OF_KEY, annualization_factor, period_day_count, previous_period
from compute.registry.ratios import REGISTRY, Metric, classify

PERIOD_END_NOTE = "v1 uses period-end values (period-average denominators are later)"


class _Period:
    def __init__(self, data: dict | None):
        data = data or {}
        self.period: str | None = data.get("period")
        self.kinds: set[str] = set(data.get("kinds", []))
        # canonical key -> {id, amount}
        self.values: dict[str, dict] = data.get("values", {})

    def get(self, key: str) -> dict | None:
        return self.values.get(key)


def _ref(key: str, value: dict) -> dict:
    return {"id": value["id"], "canonical_key": key, "amount": value["amount"]}


def compute_period(period: str, current: dict, previous: dict | None, ledger_monthly_nets: list[float],
                   cash_flow_periods: int) -> list[dict]:
    cur, prev = _Period(current), _Period(previous)
    factor = annualization_factor(period)
    days = period_day_count(period)
    results: list[dict] = []

    for metric in REGISTRY:
        base = {
            "key": metric.key,
            "label": metric.label,
            "group": metric.group,
            "display": metric.display,
            "direction": metric.direction,
            "formula": metric.formula,
            "benchmark_band": metric.band.label if metric.band else None,
            "period_delta": None,
        }

        def na(reason: str, notes: list[str] | None = None, badge: str | None = None, base=base) -> dict:
            return base | {"value": None, "status": "na", "na_reason": reason, "badge": badge, "inputs": [], "trace_notes": notes or []}

        def done(value: float, refs: list[dict], notes: list[str] | None = None, base=base, metric: Metric = metric) -> dict:
            status = classify(value, metric.band) or "healthy"
            return base | {
                "value": value,
                "status": status,
                "na_reason": None,
                "badge": None,
                "inputs": refs,
                "trace_notes": (notes or []) + [PERIOD_END_NOTE],
            }

        def missing(keys: list[str]) -> str | None:
            for key in keys:
                if cur.get(key) is None:
                    kind = KIND_OF_KEY.get(key)
                    if kind and kind not in cur.kinds:
                        return f"n/a — missing {kind} for {period}"
                    return f"n/a — {key} not mapped for {period}"
            return None

        def ratio(num: list[str], den: list[str], compute: Callable[[Callable[[str], float]], float],
                  annualize: bool = False, zero_reason: str = "n/a — zero denominator",
                  extra: list[str] | None = None) -> dict:
            if reason := missing(num + den):
                return na(reason)
            refs = [_ref(k, cur.get(k)) for k in num + den]

            def get(name: str) -> float:
                raw = cur.get(name)["amount"]
                return raw * factor if annualize and KIND_OF_KEY.get(name) == "income_statement" else raw

            if sum(cur.get(k)["amount"] for k in den) == 0:
                return na(zero_reason, extra)
            notes = list(extra or [])
            if annualize and factor != 1:
                notes.append(f"flow figures annualized ×{factor} ({period})")
            return done(compute(get), refs, notes)

        def amount(key: str) -> float:
            return cur.get(key)["amount"]

        match metric.key:
            case "current_ratio":
                results.append(ratio(["current_assets"], ["current_liabilities"], lambda g: g("current_assets") / g("current_liabilities")))
            case "quick_ratio":
                results.append(ratio(["current_assets", "inventory"], ["current_liabilities"],
                                     lambda g: (g("current_assets") - g("inventory")) / g("current_liabilities")))
            case "cash_ratio":
                results.append(ratio(["cash_and_equivalents"], ["current_liabilities"], lambda g: g("cash_and_equivalents") / g("current_liabilities")))
            case "working_capital":
                if reason := missing(["current_assets", "current_liabilities"]):
                    results.append(na(reason))
                else:
                    results.append(done(amount("current_assets") - amount("current_liabilities"),
                                        [_ref(k, cur.get(k)) for k in ("current_assets", "current_liabilities")],
                                        ["currency value — renders as StatCard/MoneyCell, not a gauge"]))
            case "debt_to_equity":
                if reason := missing(["short_term_debt", "long_term_debt", "equity"]):
                    results.append(na(reason))
                elif amount("equity") <= 0:
                    results.append(na("negative equity", badge="negative equity"))
                else:
                    results.append(ratio(["short_term_debt", "long_term_debt"], ["equity"],
                                         lambda g: (g("short_term_debt") + g("long_term_debt")) / g("equity")))
            case "debt_ratio":
                results.append(ratio(["total_liabilities"], ["total_assets"], lambda g: g("total_liabilities") / g("total_assets")))
            case "interest_coverage":
                results.append(ratio(["operating_profit"], ["interest_expense"], lambda g: g("operating_profit") / g("interest_expense"),
                                     zero_reason="n/a — no interest expense"))
            case "interest_coverage_ebitda":
                # Shown only when D&A was separately mapped.
                if cur.get("depreciation_amortization") is not None:
                    results.append(ratio(["operating_profit", "depreciation_amortization"], ["interest_expense"],
                                         lambda g: (g("operating_profit") + g("depreciation_amortization")) / g("interest_expense"),
                                         zero_reason="n/a — no interest expense"))
            case "gross_margin":
                results.append(ratio(["gross_profit"], ["revenue"], lambda g: g("gross_profit") / g("revenue")))
            case "operating_margin":
                results.append(ratio(["operating_profit"], ["revenue"], lambda g: g("operating_profit") / g("revenue")))
            case "net_margin":
                results.append(ratio(["net_income"], ["revenue"], lambda g: g("net_income") / g("revenue")))
            case "roa":
                results.append(ratio(["net_income"], ["total_assets"], lambda g: g("net_income") / g("total_assets"), annualize=True))
            case "roe":
                if reason := missing(["net_income", "equity"]):
                    results.append(na(reason))
                elif amount("equity") <= 0:
                    results.append(na("negative equity", badge="negative equity"))
                else:
                    results.append(ratio(["net_income"], ["equity"], lambda g: g("net_income") / g("equity"), annualize=True))
            case "asset_turnover":
                results.append(ratio(["revenue"], ["total_assets"], lambda g: g("revenue") / g("total_assets"), annualize=True))
            case "inventory_turnover":
                if reason := missing(["cogs", "inventory"]):
                    results.append(na(reason))
                elif amount("inventory") == 0:
                    results.append(na("n/a — no inventory"))
                else:
                    results.append(ratio(["cogs"], ["inventory"], lambda g: g("cogs") / g("inventory"), annualize=True))
            case "receivables_days":
                results.append(ratio(["receivables"], ["revenue"], lambda g: g("receivables") / g("revenue") * days,
                                     extra=[f"uses the period's actual day count ({days} days), not a hardcoded 365"]))
            case "operating_cash_flow_ratio":
                results.append(ratio(["cfo"], ["current_liabilities"], lambda g: g("cfo") / g("current_liabilities")))
            case "free_cash_flow":
                if reason := missing(["cfo", "capex"]):
                    results.append(na(reason))
                else:
                    results.append(done(amount("cfo") + amount("capex"), [_ref(k, cur.get(k)) for k in ("cfo", "capex")],
                                        ["cash-flow keys are signed as reported — capex negative",
                                         "currency value — renders as StatCard/MoneyCell"]))
            case "cfo_to_total_debt":
                results.append(ratio(["cfo"], ["short_term_debt", "long_term_debt"],
                                     lambda g: g("cfo") / (g("short_term_debt") + g("long_term_debt"))))
            case "revenue_growth" | "net_income_growth":
                key = "revenue" if metric.key == "revenue_growth" else "net_income"
                now, before = cur.get(key), prev.get(key)
                if now is None:
                    results.append(na(f"n/a — {key} not mapped for {period}"))
                elif before is None:
                    results.append(na("n/a — no prior period"))
                elif before["amount"] <= 0:
                    results.append(na("n/a — sign change", [
                        f"absolute change: {now['amount'] - before['amount']:g} (prior value ≤ 0 — percentage suppressed)"]))
                else:
                    results.append(done((now["amount"] - before["amount"]) / before["amount"], [_ref(key, now), _ref(key, before)],
                                        [f"consecutive same-kind periods ({previous_period(period)} → {period})"]))
            case "runway_months":
                results.append(_runway(cur, period, ledger_monthly_nets, cash_flow_periods, na, done))
    return results


def _runway(cur: _Period, period: str, nets: list[float], cash_flow_periods: int, na, done) -> dict:
    cash = cur.get("cash_and_equivalents")
    if cash is None:
        return na(f"n/a — missing balance_sheet for {period}")
    # Burn: from cfo when >= 3 confirmed cash-flow periods exist, else from
    # the ledger's monthly net cash flow (line-items.md §5).
    if cash_flow_periods >= 3:
        return na("n/a — statement-burn path not built yet", ["burn source: statements"])
    if len(nets) < 3:
        return na("n/a — insufficient history", [f"burn source: ledger ({len(nets)} of 3 trailing months present)"])
    average = sum(nets) / len(nets)
    if average >= 0:
        return na("n/a — cash-flow positive", ["burn source: ledger"])
    burn = -average
    return done(round(cash["amount"] / burn, 1), [_ref("cash_and_equivalents", cash)],
                ["burn source: ledger (income − expenses, trailing 3 months)", f"average monthly net cash burn: {round(burn)}"])


def compute_report(inputs: dict) -> list[dict]:
    """compute.requested kind=ratios. inputs: {period, current, previous,
    previous_previous, ledger_monthly_nets, cash_flow_periods}."""
    period = inputs["period"]
    nets = inputs.get("ledger_monthly_nets", [])
    cf = inputs.get("cash_flow_periods", 0)
    results = compute_period(period, inputs["current"], inputs.get("previous"), nets, cf)

    # period_delta: current minus the previous same-kind period, where both
    # computed. Growth metrics already are period comparisons.
    prev_period = previous_period(period)
    if prev_period and inputs.get("previous"):
        prior = {r["key"]: r for r in compute_period(prev_period, inputs["previous"], inputs.get("previous_previous"), nets, cf)}
        for result in results:
            before = prior.get(result["key"])
            if result["value"] is not None and result["group"] != "growth" and before and before["value"] is not None:
                result["period_delta"] = result["value"] - before["value"]
    return results
