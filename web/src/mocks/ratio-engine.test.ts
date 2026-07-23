// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./store";
import { computeRatioReport, previousPeriod } from "./ratio-engine";
import { ORG_CUESOFT, ORG_PERSONAL } from "./seed";
import { RATIO_REGISTRY } from "@/models/registry/ratios";

describe("ratio engine (FY2025 seed — line-items.md §5 registry)", () => {
  beforeEach(() => {
    resetDb();
  });

  const report = () => computeRatioReport(ORG_CUESOFT, "FY2025");
  const metric = (key: string) => {
    const found = report().ratios.find((ratio) => ratio.key === key);
    if (!found) throw new Error(`metric ${key} missing`);
    return found;
  };

  it("emits all 22 registry metrics (D&A mapped → EBITDA variant present)", () => {
    const keys = report().ratios.map((ratio) => ratio.key);
    expect(keys).toHaveLength(RATIO_REGISTRY.length);
    expect(keys).toContain("interest_coverage_ebitda");
  });

  it("computes liquidity ratios with benchmark bands", () => {
    const current = metric("current_ratio");
    expect(current.value).toBeCloseTo(2.5, 5);
    expect(current.status).toBe("healthy");
    expect(metric("quick_ratio").value).toBeCloseTo(25.4 / 11, 4);
    expect(metric("cash_ratio").value).toBeCloseTo(17.64 / 11, 4);
    expect(metric("working_capital").value).toBe(16_500_000);
  });

  it("computes solvency and profitability", () => {
    expect(metric("debt_to_equity").value).toBeCloseTo(10.25 / 26.75, 4);
    expect(metric("debt_to_equity").status).toBe("healthy");
    expect(metric("debt_ratio").value).toBeCloseTo(19.75 / 46.5, 4);
    expect(metric("interest_coverage").value).toBeCloseTo(18.2 / 1.45, 3);
    expect(metric("interest_coverage").status).toBe("healthy");
    expect(metric("gross_margin").value).toBeCloseTo(66.5 / 128.4, 4);
    expect(metric("net_margin").value).toBeCloseTo(12.2 / 128.4, 4);
    expect(metric("roe").value).toBeCloseTo(12.2 / 26.75, 4);
  });

  it("computes runway 7.2 months from ledger burn (docs narrative)", () => {
    const runway = metric("runway_months");
    expect(runway.value).toBe(7.2);
    expect(
      runway.trace_notes.some((note) => note.includes("burn source: ledger")),
    ).toBe(true);
  });

  it("computes CFO metrics from the confirmed FY2025 cash flow", () => {
    expect(metric("operating_cash_flow_ratio").value).toBeCloseTo(13.4 / 11, 4);
    // FCF = cfo + capex as-reported (capex signed, line-items.md §5).
    expect(metric("free_cash_flow").value).toBe(8_200_000);
  });

  it("computes growth vs FY2024 — with the sign-change suppression", () => {
    // Revenue growth: (128.4 − 96.8) / 96.8.
    expect(metric("revenue_growth").value).toBeCloseTo(31.6 / 96.8, 4);
    // FY2024 net income is a small loss → percentage suppressed with the
    // absolute change in the trace (line-items.md §5 growth rules).
    const niGrowth = metric("net_income_growth");
    expect(niGrowth.status).toBe("na");
    expect(niGrowth.na_reason).toBe("n/a — sign change");
  });

  it("renders n/a rows per the degenerate rules (FY2024 view)", () => {
    const fy2024 = computeRatioReport(ORG_CUESOFT, "FY2024");
    const metric2024 = (key: string) =>
      fy2024.ratios.find((ratio) => ratio.key === key)!;
    // No FY2024 cash-flow statement → CFO metrics n/a with reason.
    expect(metric2024("operating_cash_flow_ratio").status).toBe("na");
    expect(metric2024("operating_cash_flow_ratio").na_reason).toContain(
      "missing cash_flow",
    );
    // No FY2023 statements → growth metrics n/a — no prior period.
    expect(metric2024("revenue_growth").na_reason).toBe(
      "n/a — no prior period",
    );
    // The turnaround story's "before": warning/critical gauges.
    expect(metric2024("current_ratio").status).toBe("warning");
    expect(metric2024("debt_ratio").status).toBe("warning");
    expect(metric2024("interest_coverage").status).toBe("critical");
  });

  it("plumbs period_delta vs the prior same-kind period (gauge delta line)", () => {
    // FY2025 gauges carry current − FY2024 deltas (RatioGauge "vs FY2024").
    const fy2025 = computeRatioReport(ORG_CUESOFT, "FY2025");
    const fy2024 = computeRatioReport(ORG_CUESOFT, "FY2024");
    const value = (report: typeof fy2025, key: string) =>
      report.ratios.find((ratio) => ratio.key === key)!;
    const current = value(fy2025, "current_ratio");
    const prior = value(fy2024, "current_ratio");
    expect(current.period_delta).not.toBeNull();
    expect(current.period_delta).toBeCloseTo(
      (current.value as number) - (prior.value as number),
      6,
    );
    // The turnaround story reads positive: liquidity improved FY2024→FY2025.
    expect(current.period_delta as number).toBeGreaterThan(0);
    // Growth metrics ARE period comparisons — no delta-on-a-delta.
    expect(value(fy2025, "revenue_growth").period_delta).toBeNull();
    // FY2024 has no FY2023 statements → deltas stay null.
    expect(prior.period_delta).toBeNull();
    // Metrics n/a in the prior period attach no delta (CFO ratios: no
    // FY2024 cash-flow statement).
    expect(value(fy2025, "operating_cash_flow_ratio").period_delta).toBeNull();
  });

  it("persists formula + resolved line-item inputs (the MI-8 trace)", () => {
    const current = metric("current_ratio");
    expect(current.formula).toBe("current_assets / current_liabilities");
    expect(current.inputs.length).toBeGreaterThan(0);
    // Resolved inputs: id (audit pointer) + key + amount, so the trace is
    // auditable on sight (system QA 2026-07-19).
    for (const input of current.inputs) {
      expect(input.id).toBeTruthy();
      expect(input.canonical_key).toBeTruthy();
      expect(typeof input.amount).toBe("number");
    }
    expect(current.inputs.map((input) => input.canonical_key).sort()).toEqual([
      "current_assets",
      "current_liabilities",
    ]);
  });

  it("returns n/a rows for an org with no statements", () => {
    const personal = computeRatioReport(ORG_PERSONAL, "FY2025");
    const current = personal.ratios.find((r) => r.key === "current_ratio");
    expect(current?.status).toBe("na");
  });

  it("walks periods correctly for growth pairing", () => {
    expect(previousPeriod("FY2025")).toBe("FY2024");
    expect(previousPeriod("2026-Q1")).toBe("2025-Q4");
    expect(previousPeriod("2026-H1")).toBe("2025-H2");
  });
});
