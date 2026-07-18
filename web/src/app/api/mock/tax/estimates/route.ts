/**
 * Mock: tax estimates — computed from the ledger/statements, each with its
 * resolved remittance authority (tax-engine.md §5.5): the seed narrative
 * yields VAT 2026-06 net ₦550,600 (FIRS, due 21 Jul — T-1 banner),
 * CIT FY2026 (FIRS), and PIT 2026 → LIRS on the personal org.
 */

import { computeEstimates } from "@/mock/tax-engine";
import { fail, ok, resolveOrgId } from "@/mock/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  return ok({ items: computeEstimates(orgId) });
}
