/**
 * Mock: import job polling surface (GET job + staged rows) and discard
 * (DELETE). Processing jobs complete ~1.2s after upload on the next poll.
 */

import type { StagedTransaction } from "@/models";
import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import {
  noContent,
  notFound,
  ok,
  resolveOrgId,
  writeBlocked,
} from "@/mock/http";

type Context = { params: Promise<{ jobId: string }> };

const PROCESSING_MS = 1200;

/** Deterministic staged rows for jobs created through the mock upload. */
const generateStagedRows = (jobId: string): StagedTransaction[] => {
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
      is_duplicate: i % 9 === 8, // 2 of 18 duplicates
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
