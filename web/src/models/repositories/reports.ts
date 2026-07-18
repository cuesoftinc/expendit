/** Reports repository — artifact generation + TTL'd history (api.md §2). */

import type { ReportArtifact, ReportFormat, ReportKind } from "../report";
import type { StatementKind } from "../statement";
import { api, type RequestOptions } from "./client";

export interface ReportRequest {
  kind: ReportKind;
  period: string;
  format: ReportFormat;
  /** Required for category_deep_dive. */
  category?: string;
  /** Required for financial_statement (+ statement-grammar period). */
  statement_kind?: StatementKind;
}

export const reportsRepo = {
  create: (input: ReportRequest, options?: RequestOptions) =>
    api.post<ReportArtifact>("/reports", input, options),

  list: (options?: RequestOptions) =>
    api.get<{ items: ReportArtifact[] }>("/reports", options),
};
