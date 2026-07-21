/**
 * Mock: re-include a flagged duplicate (false positives happen with
 * recurring identical payments — flows/import.md §2 staged review).
 */

import { getDb } from "@/mocks/db";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mocks/http";

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

  const body = (await request.json()) as { include?: boolean };
  if (typeof body.include !== "boolean") {
    return fail(422, "validation_failed", "include (boolean) is required");
  }
  row.include_duplicate = body.include;
  return ok(row);
}
