/** Mock: export-all (USR-001) — 202 {job_id}; completes on first poll. */

import { getDb, nextId } from "@/mocks/store";
import { ok } from "@/mocks/http";

export async function POST() {
  const db = getDb();
  // Export during purge grace is allowed (flows/rights.md §1).
  // Record count = every row the archive will carry (honest numbers
  // from the store — the B9b strip reads "Preparing export — N records").
  const recordCount =
    db.transactions.length +
    db.importJobs.length +
    db.statements.length +
    db.lineItems.length +
    db.taxFilings.length +
    db.artifacts.length +
    db.categories.length +
    db.bankLinks.length;
  const job = {
    job_id: nextId("export"),
    status: "running" as const,
    signed_url: null,
    expires_at: null,
    record_count: recordCount,
    progress: 0,
  };
  db.exportJobs.push(job);
  return ok({ job_id: job.job_id }, 202);
}
