/**
 * Mock: widget code exchange — pending → active; code "expired" → 422
 * link_expired; relinking an already-connected account → 409
 * already_linked (flows/bank-link.md §1 edge cases).
 */

import { getDb } from "@/mocks/db";
import { mockNow } from "@/mocks/clock";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mocks/http";

type Context = { params: Promise<{ id: string }> };

/** Deterministic institution assignment for exchanged mock links. */
const MOCK_ACCOUNT = { institution: "GTBank", masked_account: "···5521" };

export async function PUT(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const link = db.bankLinks.find(
    (item) => item.id === id && item.org_id === orgId,
  );
  if (!link) return notFound();

  const body = (await request.json()) as { code?: string };
  if (!body.code) {
    return fail(422, "validation_failed", "code is required");
  }
  if (body.code === "expired") {
    return fail(
      422,
      "link_expired",
      "The widget code expired — restart the flow",
    );
  }
  if (
    db.bankLinks.some(
      (item) =>
        item.org_id === orgId &&
        item.id !== id &&
        item.status !== "pending" &&
        item.institution === MOCK_ACCOUNT.institution &&
        item.masked_account === MOCK_ACCOUNT.masked_account,
    )
  ) {
    return fail(409, "already_linked", "This account is already connected");
  }

  link.status = "active";
  link.institution = MOCK_ACCOUNT.institution;
  link.masked_account = MOCK_ACCOUNT.masked_account;
  link.last_synced_at = mockNow().toISOString();
  // Initial 6-month backfill lands as one staged import job (§2) —
  // modeled through the sync endpoint in the mock.
  return ok(link);
}
