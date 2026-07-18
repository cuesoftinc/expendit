/**
 * Mock-server HTTP helpers — ecosystem error envelope
 * {"error": {code, message, details}} with snake_case codes
 * (engineering.md §1; flows/auth.md §2).
 */

import { NextResponse } from "next/server";
import { getDb } from "./db";

export const ok = <T>(body: T, status = 200): NextResponse =>
  NextResponse.json(body as object, { status });

export const noContent = (): NextResponse =>
  new NextResponse(null, { status: 204 });

export const fail = (
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): NextResponse =>
  NextResponse.json({ error: { code, message, details } }, { status, headers });

export const notFound = (): NextResponse =>
  // Cross-org access is 404, never 403 — no existence leaks
  // (engineering.md §2).
  fail(404, "not_found", "Resource not found");

/** Org context via X-Org-Id (api.md §5); absent = the personal org. */
export const resolveOrgId = (request: Request): string | null => {
  const db = getDb();
  const header = request.headers.get("x-org-id");
  if (!header) {
    return db.orgs.find((org) => org.kind === "personal")?.id ?? null;
  }
  return db.orgs.some((org) => org.id === header) ? header : null;
};

/** 409 purge_pending on writes while a purge grace window is open. */
export const writeBlocked = (): NextResponse | null => {
  const db = getDb();
  if (db.purgeRequest?.status === "pending") {
    return fail(
      409,
      "purge_pending",
      "Account purge is pending — the ledger is read-only during the grace window",
    );
  }
  return null;
};

/** Cursor pagination over an already-filtered array. */
export const paginate = <T extends { id: string }>(
  items: T[],
  cursor: string | null,
  limit: number,
): { items: T[]; next_cursor: string | null } => {
  const start = cursor ? items.findIndex((item) => item.id === cursor) + 1 : 0;
  const pageItems = items.slice(start, start + limit);
  const next =
    start + limit < items.length
      ? (pageItems[pageItems.length - 1]?.id ?? null)
      : null;
  return { items: pageItems, next_cursor: next };
};
