/**
 * Mock: category unarchive (pages.md B8 Archive tab) — clears
 * `archived_at`, returning the category to the active registry.
 * Idempotent: unarchiving an active category is a no-op 200.
 */

import { getDb } from "@/mock/db";
import { notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();

  const category = getDb().categories.find(
    (cat) => cat.id === id && cat.org_id === orgId,
  );
  if (!category) return notFound();

  category.archived_at = null;
  return ok(category);
}
