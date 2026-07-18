/** Mock: org update — name, registered_address, fiscal_year_end. */

import type { Org } from "@/models";
import { getDb } from "@/mock/db";
import { fail, notFound, ok, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const org = getDb().orgs.find((item) => item.id === id);
  if (!org) return notFound();
  const body = (await request.json()) as Partial<
    Pick<Org, "name" | "registered_address" | "fiscal_year_end">
  >;

  if (
    body.fiscal_year_end !== undefined &&
    !/^\d{2}-\d{2}$/.test(body.fiscal_year_end)
  ) {
    return fail(422, "validation_failed", "fiscal_year_end must be MM-DD");
  }
  if (body.name !== undefined) org.name = body.name;
  if (body.fiscal_year_end !== undefined)
    org.fiscal_year_end = body.fiscal_year_end;
  if (body.registered_address !== undefined) {
    if (org.kind === "company" && !body.registered_address?.state) {
      return fail(
        422,
        "validation_failed",
        "Company orgs need a registered address with a state",
      );
    }
    org.registered_address = body.registered_address;
  }
  return ok(org);
}
