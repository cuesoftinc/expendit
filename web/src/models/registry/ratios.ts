/**
 * Ratio & metric registry — docs/line-items.md §5, verbatim: the 22 metrics
 * (17 ratios + growth/value rows), formulas over canonical keys, v1
 * benchmark-band constants ("general guidance" — changing a band is a docs
 * PR), and direction for gauge/delta coloring.
 */

export type MetricDirection = "higher" | "lower" | "band";

export type MetricGroup =
  | "liquidity"
  | "solvency"
  | "profitability"
  | "efficiency"
  | "cash_flow_scale"
  | "growth";

export interface BenchmarkBand {
  /** Inclusive bounds; null = unbounded. Evaluated in registry order. */
  healthy: { min: number | null; max: number | null };
  warning: Array<{ min: number | null; max: number | null }>;
  /** Anything not healthy/warning is critical. */
  label: string;
}

export interface MetricDef {
  key: string;
  label: string;
  group: MetricGroup;
  formula: string;
  direction: MetricDirection;
  display: "ratio" | "percent" | "currency" | "days" | "months";
  /** null = no band (trend-only or currency value). */
  band: BenchmarkBand | null;
  /** Currency values render as StatCard/MoneyCell, not RatioGauge. */
  gauge: boolean;
}

export const RATIO_REGISTRY: readonly MetricDef[] = [
  // --- Liquidity -----------------------------------------------------
  {
    key: "current_ratio",
    label: "Current ratio",
    group: "liquidity",
    formula: "current_assets / current_liabilities",
    direction: "band",
    display: "ratio",
    band: {
      healthy: { min: 1.5, max: 3.0 },
      warning: [
        { min: 1.0, max: 1.5 },
        { min: 3.0, max: null },
      ],
      label: "healthy 1.5–3.0 · warning 1.0–1.5 or >3.0 · critical <1.0",
    },
    gauge: true,
  },
  {
    key: "quick_ratio",
    label: "Quick ratio",
    group: "liquidity",
    formula: "(current_assets - inventory) / current_liabilities",
    direction: "higher",
    display: "ratio",
    band: {
      healthy: { min: 1.0, max: null },
      warning: [{ min: 0.5, max: 1.0 }],
      label: "healthy ≥1.0 · warning 0.5–1.0 · critical <0.5",
    },
    gauge: true,
  },
  {
    key: "cash_ratio",
    label: "Cash ratio",
    group: "liquidity",
    formula: "cash_and_equivalents / current_liabilities",
    direction: "higher",
    display: "ratio",
    band: {
      healthy: { min: 0.2, max: null },
      warning: [{ min: 0.1, max: 0.2 }],
      label: "healthy ≥0.2 · warning 0.1–0.2 · critical <0.1",
    },
    gauge: true,
  },
  {
    key: "working_capital",
    label: "Working capital",
    group: "cash_flow_scale",
    formula: "current_assets - current_liabilities",
    direction: "higher",
    display: "currency",
    band: null,
    gauge: false,
  },
  // --- Solvency ------------------------------------------------------
  {
    key: "debt_to_equity",
    label: "Debt-to-equity",
    group: "solvency",
    formula: "(short_term_debt + long_term_debt) / equity",
    direction: "lower",
    display: "ratio",
    band: {
      healthy: { min: null, max: 1.0 },
      warning: [{ min: 1.0, max: 2.0 }],
      label: "healthy <1.0 · warning 1.0–2.0 · critical >2.0",
    },
    gauge: true,
  },
  {
    key: "debt_ratio",
    label: "Debt ratio",
    group: "solvency",
    formula: "total_liabilities / total_assets",
    direction: "lower",
    display: "ratio",
    band: {
      healthy: { min: null, max: 0.5 },
      warning: [{ min: 0.5, max: 0.7 }],
      label: "healthy <0.5 · warning 0.5–0.7 · critical >0.7",
    },
    gauge: true,
  },
  {
    key: "interest_coverage",
    label: "Interest coverage",
    group: "solvency",
    formula: "operating_profit / interest_expense",
    direction: "higher",
    display: "ratio",
    band: {
      healthy: { min: 3.0, max: null },
      warning: [{ min: 1.5, max: 3.0 }],
      label: "healthy ≥3.0 · warning 1.5–3.0 · critical <1.5",
    },
    gauge: true,
  },
  {
    key: "interest_coverage_ebitda",
    label: "Interest coverage (EBITDA)",
    group: "solvency",
    formula:
      "(operating_profit + depreciation_amortization) / interest_expense",
    direction: "higher",
    display: "ratio",
    band: {
      healthy: { min: 3.0, max: null },
      warning: [{ min: 1.5, max: 3.0 }],
      label: "as the EBIT variant",
    },
    gauge: true,
  },
  // --- Profitability (trend-only, no bands) ---------------------------
  {
    key: "gross_margin",
    label: "Gross margin",
    group: "profitability",
    formula: "gross_profit / revenue",
    direction: "higher",
    display: "percent",
    band: null,
    gauge: true,
  },
  {
    key: "operating_margin",
    label: "Operating margin",
    group: "profitability",
    formula: "operating_profit / revenue",
    direction: "higher",
    display: "percent",
    band: null,
    gauge: true,
  },
  {
    key: "net_margin",
    label: "Net margin",
    group: "profitability",
    formula: "net_income / revenue",
    direction: "higher",
    display: "percent",
    band: null,
    gauge: true,
  },
  {
    key: "roa",
    label: "ROA",
    group: "profitability",
    formula: "net_income / total_assets",
    direction: "higher",
    display: "percent",
    band: null,
    gauge: true,
  },
  {
    key: "roe",
    label: "ROE",
    group: "profitability",
    formula: "net_income / equity",
    direction: "higher",
    display: "percent",
    band: null,
    gauge: true,
  },
  // --- Efficiency ------------------------------------------------------
  {
    key: "asset_turnover",
    label: "Asset turnover",
    group: "efficiency",
    formula: "revenue / total_assets",
    direction: "higher",
    display: "ratio",
    band: null,
    gauge: true,
  },
  {
    key: "inventory_turnover",
    label: "Inventory turnover",
    group: "efficiency",
    formula: "cogs / inventory",
    direction: "higher",
    display: "ratio",
    band: null,
    gauge: true,
  },
  {
    key: "receivables_days",
    label: "Receivables days",
    group: "efficiency",
    formula: "receivables / revenue × days",
    direction: "lower",
    display: "days",
    band: null,
    gauge: true,
  },
  // --- Cash flow & scale ------------------------------------------------
  {
    key: "operating_cash_flow_ratio",
    label: "Operating cash-flow ratio",
    group: "cash_flow_scale",
    formula: "cfo / current_liabilities",
    direction: "higher",
    display: "ratio",
    band: null,
    gauge: true,
  },
  {
    key: "free_cash_flow",
    label: "Free cash flow",
    group: "cash_flow_scale",
    formula: "cfo + capex (as-reported; capex signed negative)",
    direction: "higher",
    display: "currency",
    band: null,
    gauge: false,
  },
  {
    key: "cfo_to_total_debt",
    label: "CFO-to-total-debt",
    group: "cash_flow_scale",
    formula: "cfo / (short_term_debt + long_term_debt)",
    direction: "higher",
    display: "ratio",
    band: null,
    gauge: true,
  },
  // --- Growth ------------------------------------------------------------
  {
    key: "revenue_growth",
    label: "Revenue growth",
    group: "growth",
    formula: "(revenue_t - revenue_prev) / revenue_prev",
    direction: "higher",
    display: "percent",
    band: null,
    gauge: false,
  },
  {
    key: "net_income_growth",
    label: "Net-income growth",
    group: "growth",
    formula: "(net_income_t - net_income_prev) / net_income_prev",
    direction: "higher",
    display: "percent",
    band: null,
    gauge: false,
  },
  // --- Runway --------------------------------------------------------------
  {
    key: "runway_months",
    label: "Runway",
    group: "cash_flow_scale",
    formula: "cash_and_equivalents / avg monthly net cash burn",
    direction: "higher",
    display: "months",
    band: null,
    gauge: false,
  },
];

export type MetricKey = (typeof RATIO_REGISTRY)[number]["key"];

export const METRIC_GROUP_LABELS: Record<MetricGroup, string> = {
  liquidity: "Liquidity",
  solvency: "Solvency",
  profitability: "Profitability",
  efficiency: "Efficiency",
  cash_flow_scale: "Cash flow & scale",
  growth: "Growth",
};

/** Classify a value against a band (registry order: healthy → warning). */
export const classify = (
  value: number,
  band: BenchmarkBand | null,
): "healthy" | "warning" | "critical" | null => {
  if (!band) return null;
  const inRange = (r: { min: number | null; max: number | null }) =>
    (r.min === null || value >= r.min) && (r.max === null || value <= r.max);
  if (inRange(band.healthy)) return "healthy";
  if (band.warning.some(inRange)) return "warning";
  return "critical";
};
