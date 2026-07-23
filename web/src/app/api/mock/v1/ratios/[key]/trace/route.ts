/** Mock: formula trace for one metric (MI-8 "how we got this"). */

import { getOrComputeReport } from "@/mocks/ratio-engine";
import { PERIOD_PATTERN } from "@/models/registry/line-items";
import { fail, notFound, ok, resolveOrgId } from "@/mocks/http";

type Context = { params: Promise<{ key: string }> };

export async function GET(request: Request, context: Context) {
  const { key } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const period = new URL(request.url).searchParams.get("period");
  if (!period) {
    return fail(422, "validation_failed", "period query param is required");
  }
  if (!PERIOD_PATTERN.test(period)) {
    return fail(422, "validation_failed", `Malformed period: ${period}`, {
      param: "period",
    });
  }
  const report = getOrComputeReport(orgId, period);
  const result = report.ratios.find((ratio) => ratio.key === key);
  return result ? ok(result) : notFound();
}
