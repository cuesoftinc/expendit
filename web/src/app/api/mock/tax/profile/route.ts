/** Mock: tax profile — read + update (api.md §5; data-model.md §5). */

import type { TaxProfile } from "@/models";
import { getDb } from "@/mock/db";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const profile = getDb().taxProfiles.find((item) => item.org_id === orgId);
  return profile ? ok(profile) : notFound();
}

export async function PUT(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const profile = getDb().taxProfiles.find((item) => item.org_id === orgId);
  if (!profile) return notFound();
  const body = (await request.json()) as Partial<TaxProfile>;

  if (
    body.state_of_residence !== undefined &&
    body.state_of_residence !== null &&
    !/^NG-[A-Z]{2}$/.test(body.state_of_residence)
  ) {
    return fail(
      422,
      "validation_failed",
      "state_of_residence must be an NG state code (e.g. NG-LA)",
    );
  }
  if (body.tin !== undefined) profile.tin = body.tin;
  if (body.state_of_residence !== undefined)
    profile.state_of_residence = body.state_of_residence;
  if (body.rc_number !== undefined) profile.rc_number = body.rc_number;
  if (body.nin !== undefined) profile.nin = body.nin;
  if (body.category_treatments !== undefined) {
    profile.category_treatments = {
      ...profile.category_treatments,
      ...body.category_treatments,
    };
  }
  return ok(profile);
}
