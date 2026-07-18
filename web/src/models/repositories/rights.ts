/**
 * Data-rights repository — export-all, purge, consent (api.md §2;
 * flows/rights.md; flows/auth.md §4).
 */

import type {
  ConsentDocument,
  ConsentRecord,
  ExportJob,
  PurgeRequest,
} from "../rights";
import { api, type RequestOptions } from "./client";

export const rightsRepo = {
  /** USR-001: 202 {job_id}; poll for signed_url (7-day TTL). */
  requestExport: (options?: RequestOptions) =>
    api.post<{ job_id: string }>("/account/export", undefined, options),

  exportStatus: (jobId: string, options?: RequestOptions) =>
    api.get<ExportJob>(`/account/export/${jobId}`, options),

  /** USR-002: purge with 7-day grace window. */
  requestPurge: (options?: RequestOptions) =>
    api.post<PurgeRequest>("/account/purge", undefined, options),

  cancelPurge: (options?: RequestOptions) =>
    api.delete<void>("/account/purge", options),

  consents: (options?: RequestOptions) =>
    api.get<{ items: ConsentRecord[] }>("/consent", options),

  recordConsent: (
    document: ConsentDocument,
    version: string,
    options?: RequestOptions,
  ) => api.post<ConsentRecord>("/consent", { document, version }, options),
};
