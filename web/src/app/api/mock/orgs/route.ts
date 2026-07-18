/** Mock: orgs — list mine + create (api.md §5; data-model.md §5). */

import type { Org, OrgKind } from "@/models";
import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { fail, ok, writeBlocked } from "@/mock/http";
import { USER_IBUKUN } from "@/mock/seed";

export async function GET() {
  return ok({ items: getDb().orgs });
}

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const db = getDb();
  const body = (await request.json()) as {
    name?: string;
    kind?: OrgKind;
    currency?: string;
    country?: string;
    fiscal_year_end?: string;
    registered_address?: Org["registered_address"];
  };
  if (!body.name || !body.kind) {
    return fail(422, "validation_failed", "name and kind are required");
  }
  if (body.kind === "company" && !body.registered_address?.state) {
    return fail(
      422,
      "validation_failed",
      "Company orgs need a registered address with a state (CIT/VAT authority resolution)",
    );
  }

  const org: Org = {
    id: nextId("org"),
    name: body.name,
    kind: body.kind,
    currency: body.currency ?? "NGN",
    country: body.country ?? "NG",
    fiscal_year_end: body.fiscal_year_end ?? "12-31",
    ...(body.registered_address
      ? { registered_address: body.registered_address }
      : {}),
    created_at: mockNow().toISOString(),
  };
  db.orgs.push(org);
  db.members.push({
    org_id: org.id,
    user_id: USER_IBUKUN,
    name: "Ibukun Dairo",
    email: "ibukun.o.dairo@gmail.com",
    role: "owner",
    status: "active",
    joined_at: mockNow().toISOString(),
  });
  db.taxProfiles.push({
    id: nextId("taxprofile"),
    org_id: org.id,
    jurisdiction: "NG",
    taxpayer_kind: body.kind === "company" ? "company" : "individual",
    tin: null,
    state_of_residence: null,
    rc_number: null,
    nin: null,
    category_treatments: {},
  });
  return ok(org, 201);
}
