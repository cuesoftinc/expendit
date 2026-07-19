// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { POST as createStatement } from "@/app/api/mock/statements/route";
import { PATCH as patchMapping } from "@/app/api/mock/statements/[id]/mapping/route";
import { POST as confirmStatement } from "@/app/api/mock/statements/[id]/confirm/route";
import type { FinStatement } from "@/models";
import { getDb, resetDb } from "./db";
import { json, mockRequest, params } from "./test-helpers";

const manualBalanceSheet = (
  period: string,
  rows: Array<{ canonical_key: string; amount: number }>,
) => ({
  kind: "balance_sheet",
  period,
  currency: "NGN",
  line_items: rows,
});

const manualIncomeStatement = (
  period: string,
  rows: Array<{ canonical_key: string; amount: number }>,
) => ({
  kind: "income_statement",
  period,
  currency: "NGN",
  line_items: rows,
});

describe("mock statements (flows/statement-mapping.md, line-items.md §4)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("manual entry lands directly in staged (no parse, no AI)", async () => {
    const response = await createStatement(
      mockRequest("/api/mock/statements", {
        method: "POST",
        body: manualBalanceSheet("2026-Q1", [
          { canonical_key: "cash_and_equivalents", amount: 10_000_000 },
          { canonical_key: "payables", amount: 4_000_000 },
          { canonical_key: "share_capital", amount: 6_000_000 },
        ]),
      }),
    );
    expect(response.status).toBe(201);
    const body = await json<{ statement_id: string; mapping_status: string }>(
      response,
    );
    expect(body.mapping_status).toBe("staged");
  });

  it("rejects monthly periods (closed grammar) and free-form keys", async () => {
    const monthly = await createStatement(
      mockRequest("/api/mock/statements", {
        method: "POST",
        body: manualBalanceSheet("2026-07", [
          { canonical_key: "cash_and_equivalents", amount: 1 },
        ]),
      }),
    );
    expect(monthly.status).toBe(422);

    const freeform = await createStatement(
      mockRequest("/api/mock/statements", {
        method: "POST",
        body: manualBalanceSheet("2026-Q1", [
          { canonical_key: "petty_cash_jar", amount: 1 },
        ]),
      }),
    );
    expect(freeform.status).toBe(422);
  });

  it("currency mismatch vs the org is rejected (E-6, no FX in v1)", async () => {
    const response = await createStatement(
      mockRequest("/api/mock/statements", {
        method: "POST",
        body: {
          ...manualBalanceSheet("2026-Q1", [
            { canonical_key: "cash_and_equivalents", amount: 1 },
          ]),
          currency: "USD",
        },
      }),
    );
    expect(response.status).toBe(422);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("currency_mismatch");
  });

  it("409 period_exists for a confirmed same kind+period", async () => {
    const response = await createStatement(
      mockRequest("/api/mock/statements", {
        method: "POST",
        body: manualBalanceSheet("FY2025", [
          { canonical_key: "cash_and_equivalents", amount: 1 },
        ]),
      }),
    );
    expect(response.status).toBe(409);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("period_exists");
  });

  it("confirm: identity violation → 422 mapping_identity_violation", async () => {
    const created = await json<{ statement_id: string }>(
      await createStatement(
        mockRequest("/api/mock/statements", {
          method: "POST",
          body: manualBalanceSheet("2026-Q1", [
            { canonical_key: "cash_and_equivalents", amount: 10_000_000 },
            { canonical_key: "payables", amount: 1_000_000 },
            { canonical_key: "share_capital", amount: 2_000_000 },
          ]),
        }),
      ),
    );
    const response = await confirmStatement(
      mockRequest(`/api/mock/statements/${created.statement_id}/confirm`, {
        method: "POST",
      }),
      params({ id: created.statement_id }),
    );
    expect(response.status).toBe(422);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("mapping_identity_violation");
  });

  it("confirm: missing ASSET side counts as 0 too — liabilities+equity alone cannot confirm (Codex review regression)", async () => {
    const created = await json<{ statement_id: string }>(
      await createStatement(
        mockRequest("/api/mock/statements", {
          method: "POST",
          body: manualBalanceSheet("2026-Q1", [
            { canonical_key: "payables", amount: 1_000_000 },
            { canonical_key: "share_capital", amount: 1_000_000 },
          ]),
        }),
      ),
    );
    const response = await confirmStatement(
      mockRequest(`/api/mock/statements/${created.statement_id}/confirm`, {
        method: "POST",
      }),
      params({ id: created.statement_id }),
    );
    expect(response.status).toBe(422);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("mapping_identity_violation");
  });

  it("confirm: missing equity side counts as 0 — unbalanced sheet cannot confirm (system QA regression)", async () => {
    // Assets mapped, liabilities mapped, NO equity rows at all: the
    // identity must be treated as violated, not skipped (line-items.md §4).
    const created = await json<{ statement_id: string }>(
      await createStatement(
        mockRequest("/api/mock/statements", {
          method: "POST",
          body: manualBalanceSheet("2026-Q1", [
            { canonical_key: "cash_and_equivalents", amount: 10_000_000 },
            { canonical_key: "payables", amount: 1_000_000 },
          ]),
        }),
      ),
    );
    const response = await confirmStatement(
      mockRequest(`/api/mock/statements/${created.statement_id}/confirm`, {
        method: "POST",
      }),
      params({ id: created.statement_id }),
    );
    expect(response.status).toBe(422);
    const body = await json<{
      error: { code: string; details: { equity: number } };
    }>(response);
    expect(body.error.code).toBe("mapping_identity_violation");
    expect(body.error.details.equity).toBe(0);
  });

  it("confirm: identity-consistent statement derives rows and computes ratios", async () => {
    const created = await json<{ statement_id: string }>(
      await createStatement(
        mockRequest("/api/mock/statements", {
          method: "POST",
          body: manualBalanceSheet("2026-Q1", [
            { canonical_key: "cash_and_equivalents", amount: 8_000_000 },
            { canonical_key: "receivables", amount: 2_000_000 },
            { canonical_key: "payables", amount: 4_000_000 },
            { canonical_key: "share_capital", amount: 5_000_000 },
            { canonical_key: "retained_earnings", amount: 1_000_000 },
          ]),
        }),
      ),
    );
    const response = await confirmStatement(
      mockRequest(`/api/mock/statements/${created.statement_id}/confirm`, {
        method: "POST",
      }),
      params({ id: created.statement_id }),
    );
    expect(response.status).toBe(200);
    const statement = await json<FinStatement>(response);
    expect(statement.mapping_status).toBe("confirmed");

    const derived = getDb().lineItems.filter(
      (item) => item.statement_id === created.statement_id && item.derived,
    );
    // current_assets, total_assets, current_liabilities, total_liabilities, equity
    expect(derived.map((item) => item.canonical_key).sort()).toEqual([
      "current_assets",
      "current_liabilities",
      "equity",
      "total_assets",
      "total_liabilities",
    ]);
    expect(
      getDb().ratioReports.some((report) => report.period === "2026-Q1"),
    ).toBe(true);
  });

  it("mapping PATCH: park unmapped, fix keys, add parser-missed rows", async () => {
    const statementId = "stmt-bs-2026q2"; // staged in the seed
    const items = getDb().lineItems.filter(
      (item) => item.statement_id === statementId,
    );
    const unmapped = items.find((item) => item.status === "unmapped");
    expect(unmapped).toBeDefined();

    const response = await patchMapping(
      mockRequest(`/api/mock/statements/${statementId}/mapping`, {
        method: "PATCH",
        body: {
          updates: [
            {
              line_item_id: unmapped!.id,
              canonical_key: "current_assets_other",
            },
          ],
          additions: [
            { canonical_key: "inventory", amount: 900_000, label: "Stock" },
          ],
        },
      }),
      params({ id: statementId }),
    );
    expect(response.status).toBe(200);
    const detail = await json<{
      line_items: Array<{ canonical_key: string | null; mapped_by: string }>;
    }>(response);
    expect(
      detail.line_items.some(
        (item) => item.canonical_key === "current_assets_other",
      ),
    ).toBe(true);
    expect(
      detail.line_items.some((item) => item.canonical_key === "inventory"),
    ).toBe(true);
  });

  it("confirm blocks when >20% of value is unmapped", async () => {
    const created = await json<{ statement_id: string }>(
      await createStatement(
        mockRequest("/api/mock/statements", {
          method: "POST",
          body: manualBalanceSheet("2026-Q1", [
            { canonical_key: "cash_and_equivalents", amount: 1_000_000 },
            { canonical_key: "share_capital", amount: 1_000_000 },
          ]),
        }),
      ),
    );
    // Park a majority-value row as unmapped via PATCH additions + updates.
    const items = getDb().lineItems.filter(
      (item) => item.statement_id === created.statement_id,
    );
    await patchMapping(
      mockRequest(`/api/mock/statements/${created.statement_id}/mapping`, {
        method: "PATCH",
        body: {
          updates: [{ line_item_id: items[0].id, canonical_key: null }],
        },
      }),
      params({ id: created.statement_id }),
    );
    const response = await confirmStatement(
      mockRequest(`/api/mock/statements/${created.statement_id}/confirm`, {
        method: "POST",
      }),
      params({ id: created.statement_id }),
    );
    expect(response.status).toBe(422);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("unmapped_threshold_exceeded");
  });

  it("quarterly bucket: annualized metrics ×4, pure margins raw, receivables days use the quarter's 90 days (derived-metric semantics)", async () => {
    // Class-(c) regression (review canon 2026-07-19): derived metrics must
    // compute what their names claim when the period bucket changes —
    // quarterly flows annualize ×4 for flow/stock ratios, flow/flow
    // margins stay raw, and receivables days use the actual day count.
    const post = async (body: object) =>
      json<{ statement_id: string }>(
        await createStatement(
          mockRequest("/api/mock/statements", { method: "POST", body }),
        ),
      );
    const confirm = async (id: string) =>
      confirmStatement(
        mockRequest(`/api/mock/statements/${id}/confirm`, { method: "POST" }),
        params({ id }),
      );

    const bs = await post(
      manualBalanceSheet("2026-Q1", [
        { canonical_key: "cash_and_equivalents", amount: 10_000_000 },
        { canonical_key: "receivables", amount: 9_000_000 },
        { canonical_key: "payables", amount: 4_000_000 },
        { canonical_key: "retained_earnings", amount: 15_000_000 },
      ]),
    );
    expect((await confirm(bs.statement_id)).status).toBe(200);

    const is = await post(
      manualIncomeStatement("2026-Q1", [
        { canonical_key: "revenue", amount: 9_000_000 },
        { canonical_key: "cogs", amount: 3_000_000 },
        { canonical_key: "opex", amount: 3_000_000 },
        { canonical_key: "interest_expense", amount: 500_000 },
        { canonical_key: "tax_expense", amount: 500_000 },
      ]),
    );
    expect((await confirm(is.statement_id)).status).toBe(200);

    const { computeRatioReport } = await import("./ratio-engine");
    const report = computeRatioReport("org-cuesoft", "2026-Q1");
    const metric = (key: string) => {
      const row = report.ratios.find((item) => item.key === key);
      if (!row) throw new Error(`missing metric ${key}`);
      return row;
    };

    // Flow/flow — raw quarter figures, no annualization:
    // gross margin = (9m − 3m) / 9m.
    expect(metric("gross_margin").value).toBeCloseTo(6 / 9, 10);
    // net income = 3m op − 0.5m interest − 0.5m tax = 2m → 2/9.
    expect(metric("net_margin").value).toBeCloseTo(2 / 9, 10);
    // interest coverage = 3m / 0.5m — flow/flow, unannualized.
    expect(metric("interest_coverage").value).toBeCloseTo(6, 10);

    // Flow/stock — quarterly flows annualize ×4:
    // total_assets = 19m; asset turnover = (9m × 4) / 19m.
    expect(metric("asset_turnover").value).toBeCloseTo(36 / 19, 10);
    expect(metric("asset_turnover").trace_notes.join(" ")).toContain(
      "annualized ×4",
    );
    // ROA = (2m × 4) / 19m.
    expect(metric("roa").value).toBeCloseTo(8 / 19, 10);

    // Receivables days uses Q1 2026's actual 90 days (not 365):
    // 9m / 9m × 90.
    expect(metric("receivables_days").value).toBeCloseTo(90, 10);
    expect(metric("receivables_days").trace_notes.join(" ")).toContain(
      "90 days",
    );
  });
});
