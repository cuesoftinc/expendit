/**
 * Mock: import job polling surface (GET job + staged rows) and discard
 * (DELETE). Processing jobs complete ~1.2s after upload on the next poll.
 */

import type { StagedTransaction, TxnEntry } from "@/models";
import { getDb, nextId } from "@/mocks/store";
import { mockNow } from "@/mocks/clock";
import {
  noContent,
  notFound,
  ok,
  resolveOrgId,
  writeBlocked,
} from "@/mocks/http";

type Context = { params: Promise<{ jobId: string }> };

const PROCESSING_MS = 1200;

/**
 * Deterministic staged rows for jobs created through the mock upload.
 * `clean` skips the duplicate flags — bank feeds are exact copies of the
 * account, so bank_sync jobs stage clean rows (duplicates come from
 * re-uploaded files).
 */
const generateStagedRows = (
  jobId: string,
  options: { clean?: boolean } = {},
): StagedTransaction[] => {
  const rows: StagedTransaction[] = [];
  const merchants = [
    "POS — Shoprite Lekki",
    "Uber trip",
    "MTN airtime",
    "Jumia order",
    "Cafe Neo",
    "Transfer — client payment",
  ];
  for (let i = 0; i < 18; i += 1) {
    const isIncome = i % 6 === 5;
    rows.push({
      id: nextId("staged"),
      job_id: jobId,
      description: merchants[i % merchants.length],
      amount: 12_000 + i * 7_450,
      direction: isIncome ? "income" : "expense",
      category_id: isIncome ? "cat-consulting" : "cat-ops",
      ai_categorized: true,
      is_duplicate: options.clean ? false : i % 9 === 8, // 2 of 18 duplicates
      include_duplicate: false,
      txn_date: `2026-07-${String((i % 18) + 1).padStart(2, "0")}`,
    });
  }
  return rows;
};

export async function GET(request: Request, context: Context) {
  const { jobId } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const job = db.importJobs.find(
    (item) => item.id === jobId && item.org_id === orgId,
  );
  if (!job) return notFound();

  // Async lifecycle: processing → completed | failed (flows/import.md §1).
  // A SEEDED processing job has no clock entry — its lifecycle starts on
  // the first poll, so opening it demonstrates the normal upload flow
  // instead of an infinite spinner (PR #216 review).
  if (job.status === "processing" && db.processingSince[job.id] === undefined) {
    db.processingSince[job.id] = Date.now();
  }
  const since = db.processingSince[job.id];
  if (job.status === "processing" && since !== undefined) {
    if (Date.now() - since >= PROCESSING_MS) {
      delete db.processingSince[job.id];
      const name = job.file_name ?? "";
      if (name.includes("password-protected")) {
        job.status = "failed";
        job.error_code = "password_protected_pdf";
        job.completed_at = mockNow().toISOString();
      } else if (name.includes("empty")) {
        job.status = "completed"; // completed-empty (no_transactions_found UX)
        job.total_parsed = 0;
        job.completed_at = mockNow().toISOString();
      } else if (job.source === "bank_sync") {
        // The link's advertised "Auto-confirm clean syncs" control must
        // observably change the outcome (review canon 2026-07-19: the
        // completer never read it — a dead toggle). Clean feed rows:
        // auto_confirm on → committed straight to the ledger; off → the
        // usual staged review.
        const linkId = db.jobLinks[job.id];
        const link = db.bankLinks.find((item) => item.id === linkId);
        const rows = generateStagedRows(job.id, { clean: true });
        job.status = "completed";
        job.total_parsed = rows.length;
        job.duplicates_found = 0;
        job.ai_summary = `${rows.length} transactions synced.`;
        job.completed_at = mockNow().toISOString();
        // Purge grace keeps the ledger read-only (flows/rights.md §2) —
        // the async completion path must not commit what the sync POST
        // could no longer write (Codex P1 on PR #209): fall back to
        // staging; confirm-after-cancel goes through the guarded POST.
        const purgePending = db.purgeRequest?.status === "pending";
        if (link?.auto_confirm && !purgePending) {
          const entries: TxnEntry[] = rows.map((row) => ({
            id: nextId("txn"),
            org_id: job.org_id,
            description: row.description,
            amount: row.amount,
            direction: row.direction,
            category_id: row.category_id,
            txn_date: row.txn_date,
            source: "bank",
            source_link_id: linkId ?? null,
            ai_categorized: row.ai_categorized,
            excluded_from_reports: false,
            anomalies: [],
            created_at: mockNow().toISOString(),
          }));
          db.transactions.unshift(...entries);
          job.imported = entries.length;
          job.confirmed = true;
          // The LinkAccountCard total tracks committed rows (Codex P2).
          link.imported_txn_count += entries.length;
        } else {
          db.stagedTxns.push(...rows);
        }
      } else {
        const rows = generateStagedRows(job.id);
        db.stagedTxns.push(...rows);
        job.status = "completed";
        job.total_parsed = rows.length;
        job.duplicates_found = rows.filter((row) => row.is_duplicate).length;
        job.ai_summary = `${rows.length} transactions found in ${name}.`;
        job.completed_at = mockNow().toISOString();
      }
    }
  }

  const staged = db.stagedTxns.filter((row) => row.job_id === job.id);
  return ok({ job, staged });
}

export async function DELETE(request: Request, context: Context) {
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

  // Discard purges staging + job summary immediately (flows/import.md §2).
  db.stagedTxns = db.stagedTxns.filter((row) => row.job_id !== jobId);
  db.importJobs = db.importJobs.filter((item) => item.id !== jobId);
  return noContent();
}
