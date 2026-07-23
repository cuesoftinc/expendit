/**
 * Mock: category archive (pages.md B8 Archive tab) — quiet, reversible.
 * Sets `archived_at`; the category leaves the default list (pickers,
 * merge targets, imports) while every historical reference keeps its
 * chip. Idempotent: archiving an archived category is a no-op 200.
 */

import { getDb } from "@/mocks/store";
import { mockNow } from "@/mocks/clock";
import { notFound, ok, resolveOrgId, writeBlocked } from "@/mocks/http";

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

  if (!category.archived_at) category.archived_at = mockNow().toISOString();
  return ok(category);
}
