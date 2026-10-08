/**
 * Import pipeline repository — async upload (202 + polling), staged review,
 * confirm/discard (api.md §1 import group + §2 hardening; flows/import.md).
 */

import type { ImportJob, StagedTransaction } from "../import";
import { api, type RequestOptions } from "./client";
import { sendFile, type UploadGrant } from "./uploads";

export interface ImportJobDetail {
  job: ImportJob;
  staged: StagedTransaction[];
}

export const importsRepo = {
  /** 202 → {job_id}; Idempotency-Key per file selection. */
  /**
   * Create-then-upload (docs/system-design.md §6.1): api/common authorizes
   * the upload and returns a ticket, then the file goes to the upload
   * gateway with it. Resolves once the gateway has accepted the file.
   */
  upload: async (file: File, options: RequestOptions) => {
    const created = await api.post<UploadGrant & { job_id: string }>(
      "/import",
      { file_name: file.name, size: file.size },
      options,
    );
    // An idempotent replay of an already-uploaded job has no ticket.
    if (created.upload_ticket) await sendFile(file, created.upload_ticket);
    return { job_id: created.job_id };
  },

  list: (options?: RequestOptions) =>
    api.get<{ items: ImportJob[] }>("/import", options),

  /** The polling surface: job + staged transactions. */
  get: (jobId: string, options?: RequestOptions) =>
    api.get<ImportJobDetail>(`/import/${jobId}`, options),

  correctCategory: (
    stagedId: string,
    categoryId: string,
    options?: RequestOptions,
  ) =>
    api.put<StagedTransaction>(
      `/import/transactions/${stagedId}/category`,
      { category_id: categoryId },
      options,
    ),

  setIncludeDuplicate: (
    stagedId: string,
    include: boolean,
    options?: RequestOptions,
  ) =>
    api.put<StagedTransaction>(
      `/import/transactions/${stagedId}/include`,
      { include },
      options,
    ),

  /** Atomic + idempotent (flows/import.md §2). */
  confirm: (jobId: string, options?: RequestOptions) =>
    api.post<{ imported: number; discarded: number }>(
      `/import/${jobId}/confirm`,
      undefined,
      options,
    ),

  discard: (jobId: string, options?: RequestOptions) =>
    api.delete<void>(`/import/${jobId}`, options),
};
