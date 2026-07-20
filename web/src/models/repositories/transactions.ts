/**
 * Ledger repository — transactions CRUD + filters (pages.md B2; api.md
 * consolidation: one directioned entry surface).
 */

import type { Page, TxnEntry, TxnFilters } from "../transaction";
import { api, type RequestOptions } from "./client";

export type TxnCreate = Pick<
  TxnEntry,
  "description" | "amount" | "direction" | "category_id" | "txn_date"
>;

export type TxnUpdate = Partial<
  Pick<
    TxnEntry,
    | "description"
    | "amount"
    | "direction"
    | "category_id"
    | "txn_date"
    | "excluded_from_reports"
    // "Mark expected" (B2b): the only accepted anomaly write is [] —
    // clearing the flags; the server rejects anything else.
    | "anomalies"
  >
>;

export const transactionsRepo = {
  list: (filters: TxnFilters = {}, options: RequestOptions = {}) =>
    api.get<Page<TxnEntry>>("/transactions", {
      ...options,
      query: {
        date_from: filters.date_from,
        date_to: filters.date_to,
        category_id: filters.category_id,
        source: filters.source,
        direction: filters.direction,
        amount_min: filters.amount_min,
        amount_max: filters.amount_max,
        anomaly_only: filters.anomaly_only,
        search: filters.search,
        cursor: filters.cursor,
        limit: filters.limit,
      },
    }),

  get: (id: string, options?: RequestOptions) =>
    api.get<TxnEntry>(`/transactions/${id}`, options),

  create: (input: TxnCreate, options?: RequestOptions) =>
    api.post<TxnEntry>("/transactions", input, options),

  update: (id: string, input: TxnUpdate, options?: RequestOptions) =>
    api.put<TxnEntry>(`/transactions/${id}`, input, options),

  remove: (id: string, options?: RequestOptions) =>
    api.delete<void>(`/transactions/${id}`, options),
};
