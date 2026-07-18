/** Mock: formula trace for one metric (MI-8 "how we got this"). */

import { getOrComputeReport } from "@/mock/ratio-engine";
import { fail, notFound, ok, resolveOrgId } from "@/mock/http";

type Context = { params: Promise<{ key: string }> };

export async function GET(request: Request, context: Context) {
  const { key } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const period = new URL(request.url).searchParams.get("period");
  if (!period) {
    return fail(422, "validation_failed", "period query param is required");
  }
  const report = getOrComputeReport(orgId, period);
  const result = report.ratios.find((ratio) => ratio.key === key);
  return result ? ok(result) : notFound();
}
