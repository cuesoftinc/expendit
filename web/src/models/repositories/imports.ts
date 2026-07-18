/**
 * Import pipeline repository — async upload (202 + polling), staged review,
 * confirm/discard (api.md §1 import group + §2 hardening; flows/import.md).
 */

import type { ImportJob, StagedTransaction } from "../import";
import { api, type RequestOptions } from "./client";

export interface ImportJobDetail {
  job: ImportJob;
  staged: StagedTransaction[];
}

export const importsRepo = {
  /** 202 → {job_id}; Idempotency-Key per file selection. */
  upload: (file: File, options: RequestOptions) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ job_id: string }>("/import/upload", form, options);
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
