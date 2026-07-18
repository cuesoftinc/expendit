/** Mock: export-all (USR-001) — 202 {job_id}; completes on first poll. */

import { getDb, nextId } from "@/mock/db";
import { ok } from "@/mock/http";

export async function POST() {
  const db = getDb();
  // Export during purge grace is allowed (flows/rights.md §1).
  const job = {
    job_id: nextId("export"),
    status: "running" as const,
    signed_url: null,
    expires_at: null,
  };
  db.exportJobs.push(job);
  return ok({ job_id: job.job_id }, 202);
}
