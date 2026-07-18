/**
 * Ledger transaction entity — docs/data-model.md §1 (EXPENSE/INCOME unified
 * as a directioned entry, the target org-scoped ledger shape) + §6.1
 * provenance and the anomaly vocabulary (flows/import.md §7).
 */

export type TxnDirection = "income" | "expense";

/** Where the entry came from (TxnTable source icon, design.md §3). */
export type TxnSource = "manual" | "csv" | "pdf" | "receipt" | "bank";

export type AnomalyType =
  | "large_transaction"
  | "spending_spike"
  | "abnormal_category"
  | "duplicate_charge";

export type AnomalySeverity = "info" | "warn";

export interface Anomaly {
  rule_id: AnomalyType;
  severity: AnomalySeverity;
  /** Inspector explanation (AnomalyBadge click → anomaly-explain). */
  note: string;
}

export interface TxnEntry {
  id: string;
  org_id: string;
  description: string;
  amount: number;
  direction: TxnDirection;
  category_id: string;
  /** ISO date of the transaction. */
  txn_date: string;
  source: TxnSource;
  /** Bank link provenance — the unlink purge=true path deletes by this. */
  source_link_id: string | null;
  /** AI-assigned category not yet human-confirmed (CategoryChip ✨). */
  ai_categorized: boolean;
  excluded_from_reports: boolean;
  anomalies: Anomaly[];
  created_at: string;
}

/** Filters for the ledger list (pages.md B2). */
export interface TxnFilters {
  date_from?: string;
  date_to?: string;
  category_id?: string;
  source?: TxnSource;
  direction?: TxnDirection;
  amount_min?: number;
  amount_max?: number;
  anomaly_only?: boolean;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}
