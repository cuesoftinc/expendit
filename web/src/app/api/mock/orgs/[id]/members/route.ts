/**
 * Mock: org members — list + email invite (pending until that email's
 * first sign-in) — api.md §5; engineering.md §2.
 */

import type { Member, OrgRole } from "@/models";
import { getDb, nextId } from "@/mocks/db";
import { fail, notFound, ok, writeBlocked } from "@/mocks/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const db = getDb();
  if (!db.orgs.some((org) => org.id === id)) return notFound();
  const items = db.members.filter((member) => member.org_id === id);
  return ok({ items });
}

export async function POST(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const db = getDb();
  if (!db.orgs.some((org) => org.id === id)) return notFound();
  const body = (await request.json()) as { email?: string; role?: OrgRole };
  if (!body.email || !body.role) {
    return fail(422, "validation_failed", "email and role are required");
  }
  if (body.role === "owner") {
    return fail(422, "validation_failed", "Invites cannot grant owner");
  }
  if (
    db.members.some(
      (member) => member.org_id === id && member.email === body.email,
    )
  ) {
    return fail(409, "member_exists", "This email is already a member");
  }

  const member: Member = {
    org_id: id,
    user_id: nextId("user-invite"),
    name: "",
    email: body.email,
    role: body.role,
    status: "pending",
    joined_at: null,
  };
  db.members.push(member);
  return ok(member, 201);
}
