/**
 * Bank links repository — link/exchange/sync lifecycle (api.md §5;
 * flows/bank-link.md).
 */

import type { BankLink, BankLinkConnectConfig } from "../bank";
import { api, type RequestOptions } from "./client";

export const bankLinksRepo = {
  list: (options?: RequestOptions) =>
    api.get<{ items: BankLink[] }>("/bank-links", options),

  /** Widget bootstrap: creates a pending link + Mono connect config. */
  create: (options?: RequestOptions) =>
    api.post<BankLinkConnectConfig>("/bank-links", {}, options),

  /** Widget success code → active link (422 link_expired on stale code). */
  exchange: (id: string, code: string, options?: RequestOptions) =>
    api.put<BankLink>(`/bank-links/${id}/exchange`, { code }, options),

  /** Manual sync (rate-limited 1/10min) → 202 {job_id}. */
  sync: (id: string, options?: RequestOptions) =>
    api.post<{ job_id: string }>(`/bank-links/${id}/sync`, undefined, options),

  /** Pause/resume + auto-confirm toggle. */
  update: (
    id: string,
    patch: Partial<Pick<BankLink, "status" | "auto_confirm">>,
    options?: RequestOptions,
  ) => api.patch<BankLink>(`/bank-links/${id}`, patch, options),

  /** Unlink with keep-or-purge history choice (BNK-002). */
  unlink: (id: string, purge: boolean, options: RequestOptions = {}) =>
    api.delete<void>(`/bank-links/${id}`, {
      ...options,
      query: { purge },
    }),
};
