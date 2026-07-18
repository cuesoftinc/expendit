/**
 * Financial statement entities — docs/data-model.md §5 (FIN_STATEMENT,
 * LINE_ITEM), closed vocabulary in docs/line-items.md, review flow in
 * flows/statement-mapping.md.
 */

import type { CanonicalKey } from "./registry/line-items";

export type StatementKind = "balance_sheet" | "income_statement" | "cash_flow";

export type MappingStatus =
  "processing" | "staged" | "confirmed" | "failed" | "superseded";

export type StatementSourceFileType =
  "csv" | "xlsx" | "pdf" | "image" | "manual";

export interface FinStatement {
  id: string;
  org_id: string;
  kind: StatementKind;
  /** Closed grammar (line-items.md §6): YYYY-Qn | YYYY-H1/H2 | FYYYYY. */
  period: string;
  currency: string;
  source_file_type: StatementSourceFileType;
  mapping_status: MappingStatus;
  /** The replacement statement id (audit trail), when superseded. */
  superseded_by: string | null;
  /** Identity/derivation warnings raised at review (line-items.md §4). */
  mapping_warnings: string[];
  created_at: string;
  confirmed_at: string | null;
}

export type LineItemStatus = "mapped" | "unmapped";

export interface LineItem {
  id: string;
  statement_id: string;
  /** null while unmapped/parked. */
  canonical_key: CanonicalKey | null;
  /** As it appeared in the upload. */
  source_label: string;
  amount: number;
  status: LineItemStatus;
  /** AI suggestion confidence 0–1; null for user-mapped/manual rows. */
  confidence: number | null;
  mapped_by: "ai" | "user";
  /** Computed by derivation, not present in the source (line-items.md §4). */
  derived: boolean;
}

/**
 * A row of the B6 mapping-review screen (MappingReviewRow states —
 * design.md §8.2b): suggested (AI ✨ + confidence) / confirmed / unmapped.
 */
export type MappingRowState = "suggested" | "confirmed" | "unmapped";

export interface MappingRow {
  line_item_id: string;
  source_label: string;
  canonical_key: CanonicalKey | null;
  amount: number;
  confidence: number | null;
  state: MappingRowState;
}

/** Manual entry payload (flows/statement-mapping.md §2). */
export interface ManualStatementEntry {
  kind: StatementKind;
  period: string;
  currency: string;
  line_items: Array<{
    canonical_key: CanonicalKey;
    amount: number;
    label?: string;
  }>;
}
