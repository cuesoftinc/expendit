/** Mock: member role change + removal (owner-only in the real authz). */

import type { OrgRole } from "@/models";
import { getDb } from "@/mocks/db";
import { fail, noContent, notFound, ok, writeBlocked } from "@/mocks/http";

type Context = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id, userId } = await context.params;
  const db = getDb();
  const member = db.members.find(
    (item) => item.org_id === id && item.user_id === userId,
  );
  if (!member) return notFound();
  const body = (await request.json()) as { role?: OrgRole };
  if (!body.role || !["owner", "admin", "member"].includes(body.role)) {
    return fail(422, "validation_failed", "role must be owner|admin|member");
  }
  const owners = db.members.filter(
    (item) => item.org_id === id && item.role === "owner",
  );
  if (member.role === "owner" && owners.length === 1 && body.role !== "owner") {
    return fail(422, "last_owner", "An org needs at least one owner");
  }
  member.role = body.role;
  return ok(member);
}

export async function DELETE(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id, userId } = await context.params;
  const db = getDb();
  const member = db.members.find(
    (item) => item.org_id === id && item.user_id === userId,
  );
  if (!member) return notFound();
  if (member.role === "owner") {
    return fail(
      422,
      "last_owner",
      "Transfer ownership before removing an owner",
    );
  }
  db.members = db.members.filter(
    (item) => !(item.org_id === id && item.user_id === userId),
  );
  return noContent();
}
