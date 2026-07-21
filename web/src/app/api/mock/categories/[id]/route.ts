/** Mock: single category — read, update, delete. */

import type { Category } from "@/models";
import { getDb } from "@/mocks/db";
import {
  fail,
  noContent,
  notFound,
  ok,
  resolveOrgId,
  writeBlocked,
} from "@/mocks/http";

type Context = { params: Promise<{ id: string }> };

const find = (request: Request, id: string): Category | null => {
  const orgId = resolveOrgId(request);
  if (!orgId) return null;
  return (
    getDb().categories.find((cat) => cat.id === id && cat.org_id === orgId) ??
    null
  );
};

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const category = find(request, id);
  return category ? ok(category) : notFound();
}

export async function PUT(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const category = find(request, id);
  if (!category) return notFound();
  const body = (await request.json()) as Partial<Category>;
  if (body.name !== undefined) category.name = body.name;
  if (body.color !== undefined) category.color = body.color;
  if (body.tax_treatment !== undefined)
    category.tax_treatment = body.tax_treatment;
  if (body.vat_treatment !== undefined)
    category.vat_treatment = body.vat_treatment;
  if (body.vat_basis !== undefined) category.vat_basis = body.vat_basis;
  // A human edit confirms an AI-proposed registry entry (B8 row state).
  if (category.ai_proposed) {
    category.ai_proposed = false;
    category.ai_note = null;
  }
  return ok(category);
}

export async function DELETE(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const category = find(request, id);
  if (!category) return notFound();
  const db = getDb();
  if (db.transactions.some((txn) => txn.category_id === id)) {
    return fail(
      409,
      "category_in_use",
      "Category has transactions — re-categorize or merge first",
    );
  }
  db.categories = db.categories.filter((cat) => cat.id !== id);
  return noContent();
}
