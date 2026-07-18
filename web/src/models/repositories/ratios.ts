/** Ratio engine repository — compute/read/trace (api.md §5). */

import type { RatioReport, RatioResult } from "../ratio";
import { api, type RequestOptions } from "./client";

export const ratiosRepo = {
  get: (period: string, options: RequestOptions = {}) =>
    api.get<RatioReport>("/ratios", { ...options, query: { period } }),

  compute: (period: string, options?: RequestOptions) =>
    api.post<RatioReport>("/ratios/compute", { period }, options),

  /** Formula trace: line-item inputs behind one metric (MI-8). */
  trace: (key: string, period: string, options: RequestOptions = {}) =>
    api.get<RatioResult>(`/ratios/${key}/trace`, {
      ...options,
      query: { period },
    }),
};
