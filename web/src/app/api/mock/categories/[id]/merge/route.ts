/**
 * Mock: category merge (pages.md B8 merge tool) — repoints ledger +
 * staged-import rows from the source category to the target, then drops
 * the source. Same-type merges only.
 */

import { getDb } from "@/mock/db";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();

  const source = db.categories.find(
    (cat) => cat.id === id && cat.org_id === orgId,
  );
  if (!source) return notFound();

  const body = (await request.json()) as { into?: string };
  if (!body.into) {
    return fail(422, "validation_failed", "into (target category) is required");
  }
  if (body.into === id) {
    return fail(422, "merge_self", "Cannot merge a category into itself");
  }
  const target = db.categories.find(
    (cat) => cat.id === body.into && cat.org_id === orgId,
  );
  if (!target) return notFound();
  if (target.type !== source.type) {
    return fail(
      422,
      "merge_type_mismatch",
      `Cannot merge ${source.type} into ${target.type} — types must match`,
    );
  }
  if (target.archived_at) {
    return fail(
      422,
      "merge_target_archived",
      "Cannot merge into an archived category — restore it first",
    );
  }

  let moved = 0;
  for (const txn of db.transactions) {
    if (txn.org_id === orgId && txn.category_id === id) {
      txn.category_id = target.id;
      moved += 1;
    }
  }
  for (const staged of db.stagedTxns) {
    if (staged.category_id === id) staged.category_id = target.id;
  }
  db.categories = db.categories.filter((cat) => cat.id !== id);

  return ok({ category: target, moved_transactions: moved });
}
