/**
 * Mock create-then-upload (docs/system-design.md §6.1, §7.3). The create
 * call (POST /import, POST /statements) authorizes and returns an upload
 * ticket; the file then goes to POST /uploads with the ticket. The real
 * tickets are Ed25519-signed by api/common; the mock's are opaque ids.
 */

import type { FinStatement, ImportJob } from "@/models";
import { getDb, nextId } from "./store";

/** ≤ 15 MB, carried in the ticket (S-6). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const TICKET_TTL_MS = 5 * 60 * 1000;

export type PendingUpload =
  | {
      kind: "import_job";
      draft: ImportJob;
      expiresAt: number;
      idempotencyKey: string | null;
    }
  | {
      kind: "fin_statement";
      draft: FinStatement;
      expiresAt: number;
      idempotencyKey: string | null;
    };

export interface TicketGrant {
  upload_ticket: string;
  expires_at: string;
  max_bytes: number;
}

export const issueTicket = (
  pending: Omit<PendingUpload, "expiresAt">,
): TicketGrant => {
  const db = getDb();
  const ticket = `mock-ticket.${nextId("tkt")}`;
  const expiresAt = Date.now() + TICKET_TTL_MS;
  db.uploadTickets[ticket] = { ...pending, expiresAt } as PendingUpload;
  return {
    upload_ticket: ticket,
    expires_at: new Date(expiresAt).toISOString(),
    max_bytes: MAX_UPLOAD_BYTES,
  };
};

/** The live pending upload for an idempotency key, if any. */
export const pendingFor = (
  idempotencyKey: string,
): [string, PendingUpload] | null => {
  const db = getDb();
  for (const [ticket, pending] of Object.entries(db.uploadTickets)) {
    if (
      pending.idempotencyKey === idempotencyKey &&
      pending.expiresAt > Date.now()
    ) {
      return [ticket, pending];
    }
  }
  return null;
};

/** Extension of a file name, lower-case ("" when none). */
export const extensionOf = (name: string): string =>
  name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "";

/**
 * Consumes a ticket: single use, 5-minute expiry. Returns the pending
 * upload or an error code the route maps to 401.
 */
export const takeTicket = (
  ticket: string | null,
): PendingUpload | "invalid_ticket" | "ticket_expired" => {
  const db = getDb();
  const pending = ticket ? db.uploadTickets[ticket] : undefined;
  if (!ticket || !pending) return "invalid_ticket";
  delete db.uploadTickets[ticket];
  if (pending.expiresAt < Date.now()) return "ticket_expired";
  return pending;
};
