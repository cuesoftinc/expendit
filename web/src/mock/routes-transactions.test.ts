// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import {
  GET as listTxns,
  POST as createTxn,
} from "@/app/api/mock/transactions/route";
import {
  DELETE as deleteTxn,
  PUT as updateTxn,
} from "@/app/api/mock/transactions/[id]/route";
import type { Page, TxnEntry } from "@/models";
import { resetDb } from "./db";
import { json, mockRequest, params } from "./test-helpers";

describe("mock /transactions (docs-coherent ledger)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("July MTD sums match the narrative: income ₦8,435,200 / expenses ₦3,614,800", async () => {
    const query = "date_from=2026-07-01&date_to=2026-07-20&limit=100";
    const incomeRes = await listTxns(
      mockRequest(`/api/mock/transactions?${query}&direction=income`),
    );
    const income = await json<Page<TxnEntry>>(incomeRes);
    expect(income.items.reduce((sum, txn) => sum + txn.amount, 0)).toBe(
      8_435_200,
    );

    const expenseRes = await listTxns(
      mockRequest(`/api/mock/transactions?${query}&direction=expense`),
    );
    const expenses = await json<Page<TxnEntry>>(expenseRes);
    expect(expenses.items.reduce((sum, txn) => sum + txn.amount, 0)).toBe(
      3_614_800,
    );
  });

  it("filters: anomaly_only, category, search, amount range", async () => {
    const anomalies = await json<Page<TxnEntry>>(
      await listTxns(
        mockRequest("/api/mock/transactions?anomaly_only=true&limit=100"),
      ),
    );
    expect(anomalies.items.length).toBeGreaterThanOrEqual(3);
    expect(anomalies.items.every((txn) => txn.anomalies.length > 0)).toBe(true);

    const search = await json<Page<TxnEntry>>(
      await listTxns(
        mockRequest("/api/mock/transactions?search=kudaworks&limit=100"),
      ),
    );
    expect(search.items.length).toBeGreaterThanOrEqual(4);

    const large = await json<Page<TxnEntry>>(
      await listTxns(
        mockRequest("/api/mock/transactions?amount_min=6000000&limit=100"),
      ),
    );
    expect(large.items.every((txn) => txn.amount >= 6_000_000)).toBe(true);
  });

  it("paginates with a cursor", async () => {
    const first = await json<Page<TxnEntry>>(
      await listTxns(mockRequest("/api/mock/transactions?limit=5")),
    );
    expect(first.items).toHaveLength(5);
    expect(first.next_cursor).not.toBeNull();
    const second = await json<Page<TxnEntry>>(
      await listTxns(
        mockRequest(
          `/api/mock/transactions?limit=5&cursor=${first.next_cursor}`,
        ),
      ),
    );
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  });

  it("creates, updates (category edit clears ✨), and deletes", async () => {
    const created = await json<TxnEntry>(
      await createTxn(
        mockRequest("/api/mock/transactions", {
          method: "POST",
          body: {
            description: "Team offsite deposit",
            amount: 250_000,
            direction: "expense",
            category_id: "cat-ops",
            txn_date: "2026-07-19",
          },
        }),
      ),
    );
    expect(created.source).toBe("manual");

    const updated = await json<TxnEntry>(
      await updateTxn(
        mockRequest(`/api/mock/transactions/${created.id}`, {
          method: "PUT",
          body: { category_id: "cat-meals" },
        }),
        params({ id: created.id }),
      ),
    );
    expect(updated.category_id).toBe("cat-meals");
    expect(updated.ai_categorized).toBe(false);

    const deleted = await deleteTxn(
      mockRequest(`/api/mock/transactions/${created.id}`, {
        method: "DELETE",
      }),
      params({ id: created.id }),
    );
    expect(deleted.status).toBe(204);
  });

  it("cross-org access is 404, never 403 (engineering.md §2)", async () => {
    const response = await listTxns(
      mockRequest("/api/mock/transactions", { orgId: "org-imposter" }),
    );
    expect(response.status).toBe(404);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("not_found");
  });

  it("query grammar is a boundary: malformed params 422 instead of silently filtering (review canon)", async () => {
    const cases: Array<[string, string]> = [
      ["amount_min", "abc"], // NaN-compared every row away before the fix
      ["amount_max", "1,000"],
      ["date_from", "yesterday"],
      ["date_to", "2026-7-1"],
      ["direction", "sideways"],
      ["source", "carrier-pigeon"],
      ["limit", "abc"],
      ["limit", "0"],
    ];
    for (const [param, value] of cases) {
      const response = await listTxns(
        mockRequest(`/api/mock/transactions?${param}=${value}`),
      );
      expect(response.status, `${param}=${value}`).toBe(422);
      const body = await json<{ error: { code: string; details: unknown } }>(
        response,
      );
      expect(body.error.code).toBe("validation_failed");
    }
    // Well-formed values still work.
    const good = await listTxns(
      mockRequest(
        "/api/mock/transactions?amount_min=100&date_from=2026-07-01&direction=expense&source=bank&limit=5",
      ),
    );
    expect(good.status).toBe(200);
  });

  it("unknown cursors 422 instead of silently restarting from page one", async () => {
    const response = await listTxns(
      mockRequest("/api/mock/transactions?cursor=txn-nope"),
    );
    expect(response.status).toBe(422);
  });
});
