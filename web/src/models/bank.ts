/**
 * Bank linking entities — docs/data-model.md §5 (BANK_LINK, BANK_SYNC) with
 * the §6.2 state machine; flow contract in flows/bank-link.md.
 * provider_token_enc never crosses the API — it has no field here.
 */

export type BankLinkStatus =
  "pending" | "active" | "reauth_required" | "degraded" | "paused";

export interface BankLink {
  id: string;
  org_id: string;
  /** "mono" (E-1 ratified); plaid later. */
  provider: string;
  institution: string;
  masked_account: string;
  status: BankLinkStatus;
  last_synced_at: string | null;
  /** Opt-in after ≥3 clean syncs (flows/import.md §5). */
  auto_confirm: boolean;
  /** Count of ledger transactions originating from this link. */
  imported_txn_count: number;
  created_at: string;
}

export type BankSyncStatus = "running" | "completed" | "failed";

export interface BankSync {
  id: string;
  link_id: string;
  import_job_id: string;
  status: BankSyncStatus;
  started_at: string;
}

/** POST /bank-links response — widget bootstrap (flows/bank-link.md §1). */
export interface BankLinkConnectConfig {
  link_id: string;
  mono_connect_config: { public_key: string; reference: string };
}
