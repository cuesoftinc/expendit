/**
 * Financial statements repository — upload/manual entry, mapping review,
 * confirm (api.md §5; flows/statement-mapping.md).
 */

import type {
  FinStatement,
  LineItem,
  ManualStatementEntry,
  StatementKind,
} from "../statement";
import type { CanonicalKey } from "../registry/line-items";
import { api, type RequestOptions } from "./client";

export interface MappingDetail {
  statement: FinStatement;
  line_items: LineItem[];
}

export interface MappingPatch {
  /** Fix canonical keys / park rows unmapped. */
  updates?: Array<{
    line_item_id: string;
    canonical_key: CanonicalKey | null;
  }>;
  /** Add parser-missed rows (count toward the identity check). */
  additions?: Array<{
    canonical_key: CanonicalKey;
    amount: number;
    label?: string;
  }>;
  /** User-confirmed currency (mismatch vs org ⇒ 422 currency_mismatch). */
  currency?: string;
}

export const statementsRepo = {
  list: (options?: RequestOptions) =>
    api.get<{ items: FinStatement[] }>("/statements", options),

  get: (id: string, options?: RequestOptions) =>
    api.get<MappingDetail>(`/statements/${id}`, options),

  /** Multipart upload → 202 {statement_id, mapping_status: processing}. */
  upload: (
    file: File,
    kind: StatementKind,
    period: string,
    options: RequestOptions,
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    form.append("period", period);
    return api.post<{ statement_id: string; mapping_status: string }>(
      "/statements",
      form,
      options,
    );
  },

  /** Manual JSON entry → 201, staged directly (no parse, no AI). */
  manualEntry: (entry: ManualStatementEntry, options?: RequestOptions) =>
    api.post<{ statement_id: string; mapping_status: string }>(
      "/statements",
      entry,
      options,
    ),

  /** Poll mapping (processing|staged|failed) + staged line items. */
  mapping: (id: string, options?: RequestOptions) =>
    api.get<MappingDetail>(`/statements/${id}/mapping`, options),

  patchMapping: (id: string, patch: MappingPatch, options?: RequestOptions) =>
    api.patch<MappingDetail>(`/statements/${id}/mapping`, patch, options),

  /** Identity-checked confirm (422 mapping_identity_violation, …). */
  confirm: (id: string, options?: RequestOptions) =>
    api.post<FinStatement>(`/statements/${id}/confirm`, undefined, options),
};
