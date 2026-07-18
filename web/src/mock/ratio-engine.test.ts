// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./db";
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

  it("renders n/a rows per the degenerate rules", () => {
    // No cash-flow statement for FY2025 → CFO metrics n/a with reason.
    expect(metric("operating_cash_flow_ratio").status).toBe("na");
    expect(metric("operating_cash_flow_ratio").na_reason).toContain(
      "missing cash_flow",
    );
    // No FY2024 statements → growth metrics n/a — no prior period.
    expect(metric("revenue_growth").na_reason).toBe("n/a — no prior period");
  });

  it("persists formula + line-item inputs (the MI-8 trace)", () => {
    const current = metric("current_ratio");
    expect(current.formula).toBe("current_assets / current_liabilities");
    expect(current.inputs.length).toBeGreaterThan(0);
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
