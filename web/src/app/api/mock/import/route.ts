/** Mock: import-job history (pages.md B3). */

import { getDb } from "@/mocks/db";
import { fail, ok, resolveOrgId } from "@/mocks/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const items = getDb()
    .importJobs.filter((job) => job.org_id === orgId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return ok({ items });
}
