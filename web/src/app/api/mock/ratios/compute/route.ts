/** Mock: POST /ratios/compute {period} → 201 report with traces. */

import { recomputeReport } from "@/mocks/ratio-engine";
import { fail, ok, resolveOrgId, writeBlocked } from "@/mocks/http";

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const body = (await request.json()) as { period?: string };
  if (!body.period) {
    return fail(422, "validation_failed", "period is required");
  }
  return ok(recomputeReport(orgId, body.period), 201);
}
