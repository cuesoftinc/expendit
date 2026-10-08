"""Ratio and metric registry — docs/line-items.md §5: formulas over canonical
keys, v1 benchmark bands ("general guidance"; changing a band is a docs PR),
and direction for gauge and delta colouring."""

from dataclasses import dataclass

Range = tuple[float | None, float | None]  # inclusive (min, max); None = unbounded


@dataclass(frozen=True)
class Band:
    healthy: Range
    warning: tuple[Range, ...]
    label: str


@dataclass(frozen=True)
class Metric:
    key: str
    label: str
    group: str
    formula: str
    direction: str  # higher | lower | band
    display: str  # ratio | percent | currency | days | months
    band: Band | None = None


REGISTRY: tuple[Metric, ...] = (
    Metric("current_ratio", "Current ratio", "liquidity", "current_assets / current_liabilities", "band", "ratio",
           Band((1.5, 3.0), ((1.0, 1.5), (3.0, None)), "healthy 1.5–3.0 · warning 1.0–1.5 or >3.0 · critical <1.0")),
    Metric("quick_ratio", "Quick ratio", "liquidity", "(current_assets - inventory) / current_liabilities", "higher", "ratio",
           Band((1.0, None), ((0.5, 1.0),), "healthy ≥1.0 · warning 0.5–1.0 · critical <0.5")),
    Metric("cash_ratio", "Cash ratio", "liquidity", "cash_and_equivalents / current_liabilities", "higher", "ratio",
           Band((0.2, None), ((0.1, 0.2),), "healthy ≥0.2 · warning 0.1–0.2 · critical <0.1")),
    Metric("working_capital", "Working capital", "cash_flow_scale", "current_assets - current_liabilities", "higher", "currency"),
    Metric("debt_to_equity", "Debt-to-equity", "solvency", "(short_term_debt + long_term_debt) / equity", "lower", "ratio",
           Band((None, 1.0), ((1.0, 2.0),), "healthy <1.0 · warning 1.0–2.0 · critical >2.0")),
    Metric("debt_ratio", "Debt ratio", "solvency", "total_liabilities / total_assets", "lower", "ratio",
           Band((None, 0.5), ((0.5, 0.7),), "healthy <0.5 · warning 0.5–0.7 · critical >0.7")),
    Metric("interest_coverage", "Interest coverage", "solvency", "operating_profit / interest_expense", "higher", "ratio",
           Band((3.0, None), ((1.5, 3.0),), "healthy ≥3.0 · warning 1.5–3.0 · critical <1.5")),
    Metric("interest_coverage_ebitda", "Interest coverage (EBITDA)", "solvency",
           "(operating_profit + depreciation_amortization) / interest_expense", "higher", "ratio",
           Band((3.0, None), ((1.5, 3.0),), "as the EBIT variant")),
    Metric("gross_margin", "Gross margin", "profitability", "gross_profit / revenue", "higher", "percent"),
    Metric("operating_margin", "Operating margin", "profitability", "operating_profit / revenue", "higher", "percent"),
    Metric("net_margin", "Net margin", "profitability", "net_income / revenue", "higher", "percent"),
    Metric("roa", "ROA", "profitability", "net_income / total_assets", "higher", "percent"),
    Metric("roe", "ROE", "profitability", "net_income / equity", "higher", "percent"),
    Metric("asset_turnover", "Asset turnover", "efficiency", "revenue / total_assets", "higher", "ratio"),
    Metric("inventory_turnover", "Inventory turnover", "efficiency", "cogs / inventory", "higher", "ratio"),
    Metric("receivables_days", "Receivables days", "efficiency", "receivables / revenue × days", "lower", "days"),
    Metric("operating_cash_flow_ratio", "Operating cash-flow ratio", "cash_flow_scale", "cfo / current_liabilities", "higher", "ratio"),
    Metric("free_cash_flow", "Free cash flow", "cash_flow_scale", "cfo + capex (as-reported; capex signed negative)", "higher", "currency"),
    Metric("cfo_to_total_debt", "CFO-to-total-debt", "cash_flow_scale", "cfo / (short_term_debt + long_term_debt)", "higher", "ratio"),
    Metric("revenue_growth", "Revenue growth", "growth", "(revenue_t - revenue_prev) / revenue_prev", "higher", "percent"),
    Metric("net_income_growth", "Net-income growth", "growth", "(net_income_t - net_income_prev) / net_income_prev", "higher", "percent"),
    Metric("runway_months", "Runway", "cash_flow_scale", "cash_and_equivalents / avg monthly net cash burn", "higher", "months"),
)


def classify(value: float, band: Band | None) -> str | None:
    if band is None:
        return None

    def within(r: Range) -> bool:
        return (r[0] is None or value >= r[0]) and (r[1] is None or value <= r[1])

    if within(band.healthy):
        return "healthy"
    if any(within(r) for r in band.warning):
        return "warning"
    return "critical"
