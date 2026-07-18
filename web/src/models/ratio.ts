/**
 * Ratio engine result shapes — docs/line-items.md §5 (the auditable
 * registry) + data-model.md §5 (RATIO_REPORT persists formula + inputs).
 */

import type { MetricKey, MetricDirection } from "./registry/ratios";

/** Gauge status from the benchmark band (design.md §8.2 RatioGauge). */
export type RatioStatus = "healthy" | "warning" | "critical" | "na";

/** How the value renders (currency rows are StatCard/MoneyCell, not gauges). */
export type RatioDisplay = "ratio" | "percent" | "currency" | "days" | "months";

export interface RatioResult {
  key: MetricKey;
  label: string;
  group: string;
  /** null when n/a. */
  value: number | null;
  display: RatioDisplay;
  direction: MetricDirection;
  status: RatioStatus;
  /** "n/a — …" reason when status = na (line-items.md §5 degenerate rules). */
  na_reason: string | null;
  /** e.g. "negative equity" (shown as badge instead of a number). */
  badge: string | null;
  formula: string;
  /** The exact LINE_ITEM ids used — the MI-8 trace. */
  inputs: string[];
  /** Trace notes: annualization factors, burn source, EBIT basis, etc. */
  trace_notes: string[];
  benchmark_band: string | null;
  /** Change vs the previous same-kind period, when computable. */
  period_delta: number | null;
}

export interface RatioReport {
  id: string;
  org_id: string;
  period: string;
  ratios: RatioResult[];
  computed_at: string;
}
