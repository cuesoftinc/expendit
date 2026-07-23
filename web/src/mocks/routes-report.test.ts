// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { GET as monthlyReport } from "@/app/api/mock/v1/report/monthly/route";
import { GET as categoryReport } from "@/app/api/mock/v1/report/category/route";
import { POST as mergeCategory } from "@/app/api/mock/v1/categories/[id]/merge/route";
import type {
  Category,
  CategoryTotalsReport,
  MonthlyFlowReport,
} from "@/models";
import { getDb, resetDb } from "./store";
import { ORG_PERSONAL } from "./seed";
import { json, mockRequest, params } from "./test-helpers";

describe("mock /report/monthly (B1 aggregates, api.md §1 v1-consolidated)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("company series starts at ledger onset — no fabricated pre-onset months", async () => {
    // The Cuesoft ledger begins Jan 2026; the trailing-12 window reaches
    // back to Aug 2025. Pre-onset months must not be emitted as zeros —
    // they drew a fabricated flat segment on the B1 chart.
    const report = await json<MonthlyFlowReport>(
      await monthlyReport(mockRequest("/api/mock/v1/report/monthly")),
    );
    expect(report.items).toHaveLength(7);
    expect(report.items[0].month).toBe("2026-01");
    expect(report.items.at(-1)?.month).toBe("2026-07");
    expect(report.currency).toBe("NGN");
  });

  it("personal series covers the full trailing 12 months, every month with real data", async () => {
    const report = await json<MonthlyFlowReport>(
      await monthlyReport(
        mockRequest("/api/mock/v1/report/monthly", { orgId: ORG_PERSONAL }),
      ),
    );
    expect(report.items).toHaveLength(12);
    expect(report.items[0].month).toBe("2025-08");
    expect(report.items.at(-1)?.month).toBe("2026-07");
    // No zero-zero placeholder months anywhere in the series.
    for (const point of report.items) {
      expect(point.income + point.expense).toBeGreaterThan(0);
    }
  });

  it("personal 2025 backfill months sum to the seed-comment totals", async () => {
    const report = await json<MonthlyFlowReport>(
      await monthlyReport(
        mockRequest("/api/mock/v1/report/monthly", { orgId: ORG_PERSONAL }),
      ),
    );
    const byMonth = new Map(report.items.map((point) => [point.month, point]));
    expect(byMonth.get("2025-08")).toMatchObject({
      income: 420_000,
      expense: 88_400,
    });
    expect(byMonth.get("2025-09")).toMatchObject({
      income: 380_000,
      expense: 80_300,
    });
    expect(byMonth.get("2025-10")).toMatchObject({
      income: 510_000,
      expense: 92_100,
    });
    expect(byMonth.get("2025-11")).toMatchObject({
      income: 300_000,
      expense: 83_400,
    });
    expect(byMonth.get("2025-12")).toMatchObject({
      income: 650_000,
      expense: 1_057_300,
    });
  });

  it("personal stat-card delta stays coherent (Jul net −1,134,650 vs Jun +1,529,700 → −174.2%)", async () => {
    const report = await json<MonthlyFlowReport>(
      await monthlyReport(
        mockRequest("/api/mock/v1/report/monthly", { orgId: ORG_PERSONAL }),
      ),
    );
    const jun = report.items.find((point) => point.month === "2026-06")!;
    const jul = report.items.find((point) => point.month === "2026-07")!;
    const junNet = jun.income - jun.expense;
    const julNet = jul.income - jul.expense;
    expect(junNet).toBe(1_529_700);
    expect(julNet).toBe(-1_134_650);
    expect(Math.round(((julNet - junNet) / junNet) * 1000) / 10).toBe(-174.2);
  });

  it("MTD sums match the seed narrative (income ₦8,435,200 / expenses ₦3,614,800)", async () => {
    const report = await json<MonthlyFlowReport>(
      await monthlyReport(mockRequest("/api/mock/v1/report/monthly")),
    );
    const current = report.items.at(-1)!;
    expect(current.month).toBe("2026-07");
    expect(current.income).toBe(8_435_200);
    expect(current.expense).toBe(3_614_800);
  });

  it("runway: 7.2 months for the company org (ledger-burn rule)", async () => {
    const report = await json<MonthlyFlowReport>(
      await monthlyReport(mockRequest("/api/mock/v1/report/monthly")),
    );
    expect(report.runway.months).toBe(7.2);
    expect(report.runway.na_reason).toBeNull();
  });

  it("runway: n/a with a reason for the personal org", async () => {
    const report = await json<MonthlyFlowReport>(
      await monthlyReport(
        mockRequest("/api/mock/v1/report/monthly", { orgId: ORG_PERSONAL }),
      ),
    );
    expect(report.runway.months).toBeNull();
    expect(report.runway.na_reason).toMatch(/n\/a/);
  });
});

describe("mock /report/category (B1 donut totals)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("returns expense totals by category, largest first, for the month", async () => {
    const report = await json<CategoryTotalsReport>(
      await categoryReport(mockRequest("/api/mock/v1/report/category")),
    );
    expect(report.month).toBe("2026-07");
    expect(report.items.length).toBeGreaterThan(0);
    const totals = report.items.map((item) => item.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
    expect(totals.reduce((sum, total) => sum + total, 0)).toBe(3_614_800);
  });

  it("422 validation_failed on a malformed month", async () => {
    const response = await categoryReport(
      mockRequest("/api/mock/v1/report/category?month=july"),
    );
    expect(response.status).toBe(422);
  });
});

describe("mock /categories/{id}/merge (B8 merge tool)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("repoints ledger + staged rows to the target and drops the source", async () => {
    const db = getDb();
    const before = db.transactions.filter(
      (txn) => txn.category_id === "cat-meals",
    ).length;
    expect(before).toBeGreaterThan(0);

    const response = await mergeCategory(
      mockRequest("/api/mock/v1/categories/cat-meals/merge", {
        method: "POST",
        body: { into: "cat-ops" },
      }),
      params({ id: "cat-meals" }),
    );
    expect(response.status).toBe(200);
    const result = await json<{
      category: Category;
      moved_transactions: number;
    }>(response);
    expect(result.category.id).toBe("cat-ops");
    expect(result.moved_transactions).toBe(before);
    expect(db.categories.some((cat) => cat.id === "cat-meals")).toBe(false);
    expect(db.transactions.some((txn) => txn.category_id === "cat-meals")).toBe(
      false,
    );
  });

  it("422 merge_self and 422 merge_type_mismatch guard the tool", async () => {
    const self = await mergeCategory(
      mockRequest("/api/mock/v1/categories/cat-meals/merge", {
        method: "POST",
        body: { into: "cat-meals" },
      }),
      params({ id: "cat-meals" }),
    );
    expect(self.status).toBe(422);

    // cat-consulting is an income category; cat-meals is expense.
    const mismatch = await mergeCategory(
      mockRequest("/api/mock/v1/categories/cat-meals/merge", {
        method: "POST",
        body: { into: "cat-consulting" },
      }),
      params({ id: "cat-meals" }),
    );
    expect(mismatch.status).toBe(422);
    const body = await json<{ error: { code: string } }>(mismatch);
    expect(body.error.code).toBe("merge_type_mismatch");
  });

  it("404 for a category in another org (no existence leaks)", async () => {
    const response = await mergeCategory(
      mockRequest("/api/mock/v1/categories/cat-meals/merge", {
        method: "POST",
        orgId: ORG_PERSONAL,
        body: { into: "cat-personal-living" },
      }),
      params({ id: "cat-meals" }),
    );
    expect(response.status).toBe(404);
  });
});
