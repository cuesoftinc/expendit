/** Mock: single statement + its line items (StatementView data). */

import { getDb } from "@/mock/db";
import { notFound, ok, resolveOrgId } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const statement = db.statements.find(
    (item) => item.id === id && item.org_id === orgId,
  );
  if (!statement) return notFound();
  const lineItems = db.lineItems.filter((item) => item.statement_id === id);
  return ok({ statement, line_items: lineItems });
}
