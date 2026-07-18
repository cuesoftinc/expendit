/**
 * Report artifact entity — docs/data-model.md §2 (REPORT_ARTIFACT),
 * api.md §2 (POST /reports), pages.md B5.
 */

import type { StatementKind } from "./statement";

export type ReportKind =
  | "monthly_summary"
  | "cash_movement"
  | "category_deep_dive"
  | "financial_statement"
  | "full_export";

export type ReportFormat = "pdf" | "csv" | "json";

export type ReportArtifactStatus = "generating" | "ready" | "expired";

export interface ReportArtifact {
  id: string;
  org_id: string;
  kind: ReportKind;
  format: ReportFormat;
  /** e.g. 2026-06; statement grammar for financial_statement. */
  period: string;
  params: {
    category?: string;
    statement_kind?: StatementKind;
  };
  status: ReportArtifactStatus;
  signed_url: string | null;
  created_at: string;
  /** 30-day artifact TTL (api.md §2). */
  expires_at: string;
}
