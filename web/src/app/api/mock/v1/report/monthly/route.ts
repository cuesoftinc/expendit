/**
 * Mock: monthly income-vs-expense report (api.md §1 `GET /report/monthly/…`,
 * v1-consolidated: JWT/org-scoped, no :userID) + the runway snapshot
 * (line-items.md §5 ledger-burn rule) — the B1 overview aggregates.
 *
 * Series contract: a trailing 12-calendar-month window ending at
 * mock-today, trimmed to the org's ledger onset — months before the first
 * transaction are never emitted (no fabricated zero points on the chart).
 */

import type { MonthlyFlowPoint, RunwaySnapshot } from "@/models";
import { getDb } from "@/mocks/store";
import { mockNow } from "@/mocks/clock";
import { statementLineItems } from "@/mocks/statement-engine";
import { fail, ok, resolveOrgId } from "@/mocks/http";

const MONTHS = 12;

const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Last `count` calendar months, oldest → newest, ending at mock-today. */
const monthWindow = (count: number): string[] => {
  const now = mockNow();
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(
      monthKey(new Date(now.getFullYear(), now.getMonth() - offset, 1)),
    );
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
  let onsetMonth: string | null = null;
  for (const txn of db.transactions) {
    if (txn.org_id !== orgId || txn.excluded_from_reports) continue;
    const month = txn.txn_date.slice(0, 7);
    if (onsetMonth === null || month < onsetMonth) onsetMonth = month;
    const point = byMonth.get(month);
    if (!point) continue;
    if (txn.direction === "income") point.income += txn.amount;
    else point.expense += txn.amount;
  }

  // Months before the ledger's first entry carry no data — emitting them
  // as zeros drew a fabricated flat segment on the B1 chart. The series
  // starts at ledger onset; zero months *after* onset are true zeros
  // (an active ledger with no movement) and stay in the window.
  const items = window
    .filter((month) => onsetMonth !== null && month >= onsetMonth)
    .map((month) => byMonth.get(month)!);

  return ok({
    currency: org?.currency ?? "NGN",
    items,
    runway: runwaySnapshot(orgId, byMonth),
  });
}
