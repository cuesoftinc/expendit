/**
 * Mock: bank-link lifecycle — pause/resume/auto-confirm (PATCH) and unlink
 * with keep-or-purge (DELETE ?purge=) — flows/bank-link.md §3,
 * data-model.md §6.2 state machine.
 */

import type { BankLink } from "@/models";
import { getDb } from "@/mock/db";
import {
  fail,
  noContent,
  notFound,
  ok,
  resolveOrgId,
  writeBlocked,
} from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

const find = (request: Request, id: string): BankLink | null => {
  const orgId = resolveOrgId(request);
  if (!orgId) return null;
  return (
    getDb().bankLinks.find((link) => link.id === id && link.org_id === orgId) ??
    null
  );
};

export async function PATCH(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const link = find(request, id);
  if (!link) return notFound();
  const body = (await request.json()) as Partial<
    Pick<BankLink, "status" | "auto_confirm">
  >;

  if (body.status !== undefined) {
    // User-drivable transitions only: active ⇄ paused (§6.2).
    const allowed =
      (link.status === "active" && body.status === "paused") ||
      (link.status === "paused" && body.status === "active");
    if (!allowed) {
      return fail(
        422,
        "invalid_transition",
        `Cannot move link from ${link.status} to ${body.status}`,
      );
    }
    link.status = body.status;
  }
  if (body.auto_confirm !== undefined) link.auto_confirm = body.auto_confirm;
  return ok(link);
}

export async function DELETE(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const link = find(request, id);
  if (!link) return notFound();
  const db = getDb();
  const purge = new URL(request.url).searchParams.get("purge") === "true";

  if (purge) {
    // Hard-delete transactions originating from this link (+staged rows).
    db.transactions = db.transactions.filter(
      (txn) => txn.source_link_id !== id,
    );
  }
  // purge=false (default): imported transactions stay — the user's records.
  db.bankLinks = db.bankLinks.filter((item) => item.id !== id);
  return noContent();
}
