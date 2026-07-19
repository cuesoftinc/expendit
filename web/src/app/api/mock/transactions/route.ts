/** Mock: ledger transactions — list (filters + cursor) and create. */

import type { TxnDirection, TxnEntry, TxnSource } from "@/models";
import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { fail, ok, paginate, resolveOrgId, writeBlocked } from "@/mock/http";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Shape AND calendar validity — 2026-02-30 is not a date (Codex round 3). */
const isRealDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};
const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;
const LIMIT_PATTERN = /^\d+$/;
const SOURCES: readonly string[] = ["manual", "csv", "pdf", "receipt", "bank"];
const DIRECTIONS: readonly string[] = ["income", "expense"];

/**
 * Query grammar is a boundary (review canon 2026-07-19): malformed values
 * 422 with the offending param instead of silently filtering — a
 * `amount_min=abc` used to NaN-compare every row away, reading like an
 * empty ledger.
 */
const invalidParam = (name: string, value: string) =>
  fail(422, "validation_failed", `Malformed ${name}: ${value}`, {
    param: name,
  });

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
  const rawLimit = params.get("limit");

  for (const [name, value] of [
    ["date_from", dateFrom],
    ["date_to", dateTo],
  ] as const) {
    if (value !== null && !isRealDate(value)) {
      return invalidParam(name, value);
    }
  }
  if (source !== null && !SOURCES.includes(source)) {
    return invalidParam("source", source);
  }
  if (direction !== null && !DIRECTIONS.includes(direction)) {
    return invalidParam("direction", direction);
  }
  for (const [name, value] of [
    ["amount_min", amountMin],
    ["amount_max", amountMax],
  ] as const) {
    if (
      value !== null &&
      (!AMOUNT_PATTERN.test(value) || !Number.isFinite(Number(value)))
    ) {
      // Digit-only but overflowing values become Infinity and silently
      // unfilter/empty the ledger (Codex round 4).
      return invalidParam(name, value);
    }
  }
  if (
    rawLimit !== null &&
    (!LIMIT_PATTERN.test(rawLimit) || rawLimit === "0")
  ) {
    return invalidParam("limit", rawLimit);
  }
  const limit = Math.min(Number(rawLimit ?? 50), 100);

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

  const page = paginate(filtered, cursor, limit);
  if (!page) return invalidParam("cursor", cursor ?? "");
  return ok(page);
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
