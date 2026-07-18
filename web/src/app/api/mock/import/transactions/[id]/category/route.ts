/** Mock: staged-row category correction (MI-4 — clears the AI ✨). */

import { getDb } from "@/mock/db";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const row = db.stagedTxns.find((item) => item.id === id);
  if (!row) return notFound();
  const job = db.importJobs.find(
    (item) => item.id === row.job_id && item.org_id === orgId,
  );
  if (!job) return notFound();

  const body = (await request.json()) as { category_id?: string };
  if (!body.category_id) {
    return fail(422, "validation_failed", "category_id is required");
  }
  if (
    !db.categories.some(
      (cat) => cat.id === body.category_id && cat.org_id === orgId,
    )
  ) {
    return fail(422, "validation_failed", "Unknown category");
  }

  row.category_id = body.category_id;
  row.ai_categorized = false; // human confirm clears the ✨ (MI-4)
  return ok(row);
}
