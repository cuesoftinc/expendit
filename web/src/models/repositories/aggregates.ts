/**
 * Dashboard aggregates repository — the api.md §1 report endpoints,
 * v1-consolidated (JWT-scoped, no :userID): monthly income-vs-expense and
 * category totals for the B1 overview.
 */

import type { CategoryTotalsReport, MonthlyFlowReport } from "../aggregates";
import { api, type RequestOptions } from "./client";

export const aggregatesRepo = {
  /** 12-month income-vs-expense series + the runway snapshot. */
  monthly: (options?: RequestOptions) =>
    api.get<MonthlyFlowReport>("/report/monthly", options),

  /** Expense totals by category for one month (default: current). */
  categoryTotals: (month?: string, options: RequestOptions = {}) =>
    api.get<CategoryTotalsReport>("/report/category", {
      ...options,
      query: { month },
    }),
};
