/** Mock: single transaction — read, update, delete. */

import type { TxnEntry } from "@/models";
import { getDb } from "@/mock/db";
import {
  fail,
  noContent,
  notFound,
  ok,
  resolveOrgId,
  writeBlocked,
} from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

const find = (request: Request, id: string): TxnEntry | null => {
  const orgId = resolveOrgId(request);
  if (!orgId) return null;
  return (
    getDb().transactions.find((txn) => txn.id === id && txn.org_id === orgId) ??
    null
  );
};

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const txn = find(request, id);
  return txn ? ok(txn) : notFound();
}

export async function PUT(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const txn = find(request, id);
  if (!txn) return notFound();
  const body = (await request.json()) as Partial<TxnEntry> & {
    /** "Mark expected" (anomaly-explain footer) — flips every flag. */
    mark_anomalies_expected?: boolean;
  };

  if (body.amount !== undefined && body.amount <= 0) {
    return fail(422, "validation_failed", "Amount must be positive");
  }
  if (body.mark_anomalies_expected) {
    txn.anomalies = txn.anomalies.map((anomaly) => ({
      ...anomaly,
      expected: true,
    }));
  }
  if (body.description !== undefined) txn.description = body.description;
  if (body.amount !== undefined) txn.amount = body.amount;
  if (body.direction !== undefined) txn.direction = body.direction;
  if (body.txn_date !== undefined) txn.txn_date = body.txn_date;
  if (body.excluded_from_reports !== undefined)
    txn.excluded_from_reports = body.excluded_from_reports;
  if (body.category_id !== undefined) {
    txn.category_id = body.category_id;
    txn.ai_categorized = false; // human confirmation clears the ✨ (MI-4)
  }
  return ok(txn);
}

export async function DELETE(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const txn = find(request, id);
  if (!txn) return notFound();
  const db = getDb();
  db.transactions = db.transactions.filter((item) => item.id !== id);
  return noContent();
}
