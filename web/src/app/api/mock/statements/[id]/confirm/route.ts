/**
 * Mock: statement confirm — runs derivations + identity cross-check
 * (line-items.md §4), handles supersede, recomputes affected ratio
 * reports (flows/statement-mapping.md §4).
 */

import { getDb } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { recomputeReport } from "@/mock/ratio-engine";
import { runDerivations, validateConfirm } from "@/mock/statement-engine";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const statement = db.statements.find(
    (item) => item.id === id && item.org_id === orgId,
  );
  if (!statement) return notFound();

  if (statement.mapping_status === "confirmed") return ok(statement); // idempotent
  if (statement.mapping_status !== "staged") {
    return fail(
      422,
      "mapping_not_staged",
      `Mapping is ${statement.mapping_status} — stage it before confirming`,
    );
  }

  // Derivations first (derived keys compute when absent; cross-check when
  // present) so the identity check sees the complete statement.
  const warnings = runDerivations(statement);

  const check = validateConfirm(statement);
  if (!check.ok) {
    return fail(422, check.code as string, check.message ?? "", check.details);
  }

  // Supersede: replacement confirmed for the same kind+period.
  const superseded = db.statements.find(
    (item) =>
      item.org_id === orgId &&
      item.id !== statement.id &&
      item.kind === statement.kind &&
      item.period === statement.period &&
      item.mapping_status === "confirmed",
  );
  if (superseded) {
    superseded.mapping_status = "superseded";
    superseded.superseded_by = statement.id;
  }

  statement.mapping_status = "confirmed";
  statement.confirmed_at = mockNow().toISOString();
  statement.mapping_warnings = warnings;

  // Superseding/confirming recomputes the period's ratio report.
  recomputeReport(orgId, statement.period);

  return ok(statement);
}
