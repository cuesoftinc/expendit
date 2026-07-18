/**
 * Import pipeline entities — docs/data-model.md §1 (IMPORT_JOB,
 * IMPORTED_TRANSACTION) + §6.1 (source provenance), flows/import.md.
 */

import type { Anomaly, TxnDirection } from "./transaction";

export type ImportJobStatus = "processing" | "completed" | "failed";
export type ImportSource = "upload" | "bank_sync";
export type ImportFileType = "csv" | "pdf" | "image";

export interface ImportJobSummary {
  total_income: number;
  total_expense: number;
  net: number;
  by_category: Record<string, number>;
}

export interface ImportJob {
  id: string;
  org_id: string;
  source: ImportSource;
  status: ImportJobStatus;
  file_name: string | null;
  file_type: ImportFileType | null;
  total_parsed: number;
  duplicates_found: number;
  imported: number;
  summary: ImportJobSummary | null;
  /** LLM narrative. */
  ai_summary: string | null;
  anomalies: Anomaly[];
  /** Partial-extraction notices, surfaced as a review banner. */
  warnings: string[];
  /** Failure-taxonomy code when status = failed (flows/import.md §3). */
  error_code: string | null;
  confirmed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface StagedTransaction {
  id: string;
  job_id: string;
  description: string;
  amount: number;
  direction: TxnDirection;
  /** AI-assigned, user-correctable (category id). */
  category_id: string;
  /** True until a human confirms the category (MI-4 ✨ clear). */
  ai_categorized: boolean;
  is_duplicate: boolean;
  /** User re-included a flagged duplicate (flows/import.md §4). */
  include_duplicate: boolean;
  txn_date: string;
}
