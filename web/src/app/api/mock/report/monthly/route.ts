/**
 * Mock: monthly income-vs-expense report (api.md §1 `GET /report/monthly/…`,
 * v1-consolidated: JWT/org-scoped, no :userID) + the runway snapshot
 * (line-items.md §5 ledger-burn rule) — the B1 overview aggregates.
 */

import type { MonthlyFlowPoint, RunwaySnapshot } from "@/models";
import { getDb } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { statementLineItems } from "@/mock/statement-engine";
import { fail, ok, resolveOrgId } from "@/mock/http";

const MONTHS = 12;

const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Last `count` calendar months, oldest → newest, ending at mock-today. */
const monthWindow = (count: number): string[] => {
  const now = mockNow();
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - offset, 1)));
  }
  return keys;
};

/** Runway (company orgs): cash from the latest confirmed balance sheet ÷
 * average trailing-3-full-months net ledger burn. */
const runwaySnapshot = (
  orgId: string,
  flowsByMonth: Map<string, MonthlyFlowPoint>,
): RunwaySnapshot => {
  const db = getDb();
  const org = db.orgs.find((item) => item.id === orgId);
  if (org?.kind !== "company") {
    return { months: null, na_reason: "n/a — runway tracks company orgs" };
  }

  const confirmedBs = db.statements
    .filter(
      (statement) =>
        statement.org_id === orgId &&
        statement.kind === "balance_sheet" &&
        statement.mapping_status === "confirmed",
    )
    .sort((a, b) => ((a.confirmed_at ?? "") < (b.confirmed_at ?? "") ? 1 : -1));
  const cashRow = confirmedBs
    .flatMap((statement) => statementLineItems(statement.id))
    .find((item) => item.canonical_key === "cash_and_equivalents");
  if (!cashRow) {
    return {
      months: null,
      na_reason: "n/a — no confirmed balance sheet (cash unknown)",
    };
  }

  // Trailing 3 *full* months (exclude the current MTD month).
  const trailing = monthWindow(4).slice(0, 3);
  const nets = trailing
    .map((month) => flowsByMonth.get(month))
    .filter((point): point is MonthlyFlowPoint => point !== undefined)
    .map((point) => point.income - point.expense);
  if (nets.length < 3) {
    return { months: null, na_reason: "n/a — insufficient ledger history" };
  }
  const avgNet = nets.reduce((sum, net) => sum + net, 0) / nets.length;
  if (avgNet >= 0) {
    return { months: null, na_reason: "n/a — cash-flow positive" };
  }
  const burn = Math.abs(avgNet);
  return {
    months: Math.round((cashRow.amount / burn) * 10) / 10,
    na_reason: null,
  };
};

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();
  const org = db.orgs.find((item) => item.id === orgId);

  const window = monthWindow(MONTHS);
  const byMonth = new Map<string, MonthlyFlowPoint>(
    window.map((month) => [month, { month, income: 0, expense: 0 }]),
  );
  for (const txn of db.transactions) {
    if (txn.org_id !== orgId || txn.excluded_from_reports) continue;
    const point = byMonth.get(txn.txn_date.slice(0, 7));
    if (!point) continue;
    if (txn.direction === "income") point.income += txn.amount;
    else point.expense += txn.amount;
  }

  return ok({
    currency: org?.currency ?? "NGN",
    items: window.map((month) => byMonth.get(month)!),
    runway: runwaySnapshot(orgId, byMonth),
  });
}
