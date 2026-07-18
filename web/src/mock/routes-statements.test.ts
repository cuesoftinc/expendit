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
});
