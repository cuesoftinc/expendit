/**
 * Data-rights entities — docs/data-model.md §2 (PURGE_REQUEST,
 * CONSENT_RECORD) + flows/rights.md (export-all job).
 */

export type ConsentDocument = "tos" | "privacy" | "ai_processing";

export interface ConsentRecord {
  id: string;
  user_id: string;
  document: ConsentDocument;
  version: string;
  accepted_at: string;
}

export type ExportJobStatus = "running" | "completed" | "failed";

export interface ExportJob {
  job_id: string;
  status: ExportJobStatus;
  signed_url: string | null;
  /** 7-day download TTL (flows/rights.md §1). */
  expires_at: string | null;
}

export type PurgeStatus = "pending" | "cancelled" | "executed";

export interface PurgeRequest {
  id: string;
  user_id: string;
  status: PurgeStatus;
  requested_at: string;
  /** End of the 7-day grace window (flows/rights.md §2). */
  effective_at: string;
}
