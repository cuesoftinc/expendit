/**
 * Mock: staged-review commit — atomic + idempotent (flows/import.md §2):
 * duplicates excluded unless re-included; second call is a 200 no-op via
 * 409 job_already_confirmed treated as success by clients.
 */

import type { TxnEntry } from "@/models";
import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { jobId } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const job = db.importJobs.find(
    (item) => item.id === jobId && item.org_id === orgId,
  );
  if (!job) return notFound();
  if (job.status !== "completed") {
    return fail(422, "job_not_ready", "Job is not ready to confirm", {
      status: job.status,
    });
  }
  if (job.confirmed) {
    // Double-confirm race: idempotent success (409 job_already_confirmed
    // exists in the taxonomy; the mock returns the no-op result directly).
    return ok({ imported: job.imported, discarded: 0 });
  }

  const staged = db.stagedTxns.filter((row) => row.job_id === jobId);
  const toImport = staged.filter(
    (row) => !row.is_duplicate || row.include_duplicate,
  );
  const discarded = staged.length - toImport.length;

  const fileSource =
    job.source === "bank_sync"
      ? "bank"
      : job.file_type === "pdf"
        ? "pdf"
        : job.file_type === "image"
          ? "receipt"
          : "csv";

  const entries: TxnEntry[] = toImport.map((row) => ({
    id: nextId("txn"),
    org_id: orgId,
    description: row.description,
    amount: row.amount,
    direction: row.direction,
    category_id: row.category_id,
    txn_date: row.txn_date,
    source: fileSource,
    // Bank rows keep their link provenance so DELETE ?purge=true can
    // remove every transaction from that link (Codex round 3).
    source_link_id:
      job.source === "bank_sync" ? (db.jobLinks[job.id] ?? null) : null,
    ai_categorized: row.ai_categorized,
    excluded_from_reports: false,
    anomalies: [],
    created_at: mockNow().toISOString(),
  }));

  // Atomic: all-or-error (single synchronous store mutation).
  db.transactions.unshift(...entries);
  if (job.source === "bank_sync") {
    // The LinkAccountCard total tracks committed rows (Codex P2 class).
    const link = db.bankLinks.find((item) => item.id === db.jobLinks[job.id]);
    if (link) link.imported_txn_count += entries.length;
  }
  db.stagedTxns = db.stagedTxns.filter((row) => row.job_id !== jobId);
  job.confirmed = true;
  job.imported = entries.length;

  return ok({ imported: entries.length, discarded });
}
