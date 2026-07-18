/** Mock: ledger transactions — list (filters + cursor) and create. */

import type { TxnDirection, TxnEntry, TxnSource } from "@/models";
import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { fail, ok, paginate, resolveOrgId, writeBlocked } from "@/mock/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();
  const params = new URL(request.url).searchParams;

  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");
  const categoryId = params.get("category_id");
  const source = params.get("source") as TxnSource | null;
  const direction = params.get("direction") as TxnDirection | null;
  const amountMin = params.get("amount_min");
  const amountMax = params.get("amount_max");
  const anomalyOnly = params.get("anomaly_only") === "true";
  const search = params.get("search")?.toLowerCase() ?? null;
  const cursor = params.get("cursor");
  const limit = Math.min(Number(params.get("limit") ?? 50), 100);

  const filtered = db.transactions
    .filter((txn) => txn.org_id === orgId)
    .filter((txn) => (dateFrom ? txn.txn_date >= dateFrom : true))
    .filter((txn) => (dateTo ? txn.txn_date <= dateTo : true))
    .filter((txn) => (categoryId ? txn.category_id === categoryId : true))
    .filter((txn) => (source ? txn.source === source : true))
    .filter((txn) => (direction ? txn.direction === direction : true))
    .filter((txn) => (amountMin ? txn.amount >= Number(amountMin) : true))
    .filter((txn) => (amountMax ? txn.amount <= Number(amountMax) : true))
    .filter((txn) => (anomalyOnly ? txn.anomalies.length > 0 : true))
    .filter((txn) =>
      search ? txn.description.toLowerCase().includes(search) : true,
    )
    .sort((a, b) => (a.txn_date < b.txn_date ? 1 : -1));

  return ok(paginate(filtered, cursor, limit));
}

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();
  const body = (await request.json()) as Partial<TxnEntry>;

  if (!body.description || !body.amount || !body.direction || !body.txn_date) {
    return fail(422, "validation_failed", "Missing required fields", {
      required: ["description", "amount", "direction", "txn_date"],
    });
  }
  if (
    body.category_id &&
    !db.categories.some(
      (cat) => cat.id === body.category_id && cat.org_id === orgId,
    )
  ) {
    return fail(422, "validation_failed", "Unknown category");
  }

  const txn: TxnEntry = {
    id: nextId("txn"),
    org_id: orgId,
    description: body.description,
    amount: body.amount,
    direction: body.direction,
    category_id: body.category_id ?? "",
    txn_date: body.txn_date,
    source: "manual",
    source_link_id: null,
    ai_categorized: false,
    excluded_from_reports: false,
    anomalies: [],
    created_at: mockNow().toISOString(),
  };
  db.transactions.unshift(txn);
  return ok(txn, 201);
}
