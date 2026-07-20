/** Mock: categories — list and create (pages.md B8). */

import type { Category } from "@/models";
import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { fail, ok, resolveOrgId, writeBlocked } from "@/mock/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();
  const year = `${mockNow().getFullYear()}-`;
  // Usage meta ("N transactions this year") — merge-safety context
  // computed from the ledger on read (Figma B8 190:2836).
  const items = db.categories
    .filter((cat) => cat.org_id === orgId)
    .map((cat) => ({
      ...cat,
      txn_count_year: db.transactions.filter(
        (txn) =>
          txn.org_id === orgId &&
          txn.category_id === cat.id &&
          txn.txn_date.startsWith(year),
      ).length,
    }));
  return ok({ items });
}

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();
  const body = (await request.json()) as Partial<Category>;

  if (!body.name || !body.type) {
    return fail(422, "validation_failed", "Missing required fields", {
      required: ["name", "type"],
    });
  }
  if (
    db.categories.some(
      (cat) =>
        cat.org_id === orgId &&
        cat.name.toLowerCase() === body.name?.toLowerCase() &&
        cat.type === body.type,
    )
  ) {
    return fail(409, "category_exists", "A category with this name exists");
  }

  const category: Category = {
    id: nextId("cat"),
    org_id: orgId,
    name: body.name,
    type: body.type,
    color: body.color ?? "#6E6E76",
    tax_treatment: body.tax_treatment ?? "taxable_income",
    vat_treatment: body.vat_treatment ?? "vatable",
    vat_basis: body.vat_basis ?? "inclusive",
  };
  db.categories.push(category);
  return ok(category, 201);
}
