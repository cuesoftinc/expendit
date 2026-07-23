/** Mock: ratio report for a period (GET ?period=) — computes lazily. */

import { getOrComputeReport } from "@/mocks/ratio-engine";
import { PERIOD_PATTERN } from "@/models/registry/line-items";
import { fail, ok, resolveOrgId } from "@/mocks/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const period = new URL(request.url).searchParams.get("period");
  if (!period) {
    return fail(422, "validation_failed", "period query param is required");
  }
  // Closed period grammar (line-items.md §6): malformed values 422
  // instead of caching an all-n/a report under a garbage key (review
  // canon 2026-07-19).
  if (!PERIOD_PATTERN.test(period)) {
    return fail(422, "validation_failed", `Malformed period: ${period}`, {
      param: "period",
    });
  }
  return ok(getOrComputeReport(orgId, period));
}
