/** Mock: ratio report for a period (GET ?period=) — computes lazily. */

import { getOrComputeReport } from "@/mock/ratio-engine";
import { fail, ok, resolveOrgId } from "@/mock/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const period = new URL(request.url).searchParams.get("period");
  if (!period) {
    return fail(422, "validation_failed", "period query param is required");
  }
  return ok(getOrComputeReport(orgId, period));
}
