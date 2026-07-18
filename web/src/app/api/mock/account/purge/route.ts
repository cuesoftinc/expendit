/**
 * Mock: purge (USR-002) — POST schedules with a 7-day grace window
 * (duplicate → 409 purge_pending); DELETE cancels within grace
 * (→ 410 grace_expired after execution) — flows/rights.md §2.
 */

import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { fail, noContent, ok } from "@/mock/http";
import { USER_IBUKUN } from "@/mock/seed";

export async function POST() {
  const db = getDb();
  if (db.purgeRequest?.status === "pending") {
    return fail(
      409,
      "purge_pending",
      "A purge request is already pending — the grace window is open",
    );
  }
  const now = mockNow();
  const effective = new Date(now);
  effective.setDate(effective.getDate() + 7); // 7-day grace (E-5)
  db.purgeRequest = {
    id: nextId("purge"),
    user_id: USER_IBUKUN,
    status: "pending",
    requested_at: now.toISOString(),
    effective_at: effective.toISOString(),
  };
  return ok(db.purgeRequest, 202);
}

export async function DELETE() {
  const db = getDb();
  if (!db.purgeRequest) {
    return fail(404, "not_found", "No purge request on file");
  }
  if (db.purgeRequest.status === "executed") {
    return fail(410, "grace_expired", "The grace window has passed");
  }
  db.purgeRequest.status = "cancelled";
  return noContent();
}
