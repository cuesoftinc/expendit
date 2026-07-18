/**
 * Mock: manual sync — 202 {job_id} (one import job, source bank_sync);
 * rate-limited 1/10min per link → 429 rate_limited (+Retry-After);
 * reauth_required/paused links refuse (flows/bank-link.md §2/§3).
 */

import type { ImportJob } from "@/models";
import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request, context: Context) {
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

  if (link.status === "reauth_required") {
    return fail(409, "reauth_required", "Reconnect the account to sync");
  }
  if (link.status === "paused") {
    return fail(409, "link_paused", "Resume the link to sync");
  }

  const last = db.lastManualSync[id];
  if (last !== undefined && Date.now() - last < RATE_WINDOW_MS) {
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (Date.now() - last)) / 1000);
    return fail(
      429,
      "rate_limited",
      "Manual sync is limited to once every 10 minutes per link",
      {},
      { "Retry-After": String(retryAfter) },
    );
  }
  db.lastManualSync[id] = Date.now();

  const job: ImportJob = {
    id: nextId("job"),
    org_id: orgId,
    source: "bank_sync",
    status: "processing",
    file_name: null,
    file_type: null,
    total_parsed: 0,
    duplicates_found: 0,
    imported: 0,
    summary: null,
    ai_summary: null,
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: false,
    created_at: mockNow().toISOString(),
    completed_at: null,
  };
  db.importJobs.unshift(job);
  db.processingSince[job.id] = Date.now();
  link.last_synced_at = mockNow().toISOString();

  return ok({ job_id: job.id }, 202);
}
