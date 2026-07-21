/**
 * Mock: category totals report (api.md §1 `GET /report/chart/category/…`,
 * v1-consolidated) — expense totals by category for one month, feeding the
 * B1 category donut (donut slices take registry category colors).
 */

import { getDb } from "@/mocks/db";
import { mockNow } from "@/mocks/clock";
import { fail, ok, resolveOrgId } from "@/mocks/http";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");

  const now = mockNow();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = new URL(request.url).searchParams.get("month") ?? current;
  if (!MONTH_PATTERN.test(month)) {
    return fail(422, "validation_failed", "month must be YYYY-MM");
  }

  const totals = new Map<string, number>();
  for (const txn of getDb().transactions) {
    if (
      txn.org_id !== orgId ||
      txn.excluded_from_reports ||
      txn.direction !== "expense" ||
      !txn.txn_date.startsWith(month)
    ) {
      continue;
    }
    totals.set(
      txn.category_id,
      (totals.get(txn.category_id) ?? 0) + txn.amount,
    );
  }

  const items = [...totals.entries()]
    .map(([category_id, total]) => ({ category_id, total }))
    .sort((a, b) => b.total - a.total);

  return ok({ month, items });
}
