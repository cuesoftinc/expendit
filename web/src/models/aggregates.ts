/**
 * Dashboard aggregate shapes — the api.md §1 report endpoints,
 * v1-consolidated (monthly income-vs-expense + category totals) that feed
 * the B1 overview (pages.md B1; web-implementation.md §6 mock table).
 */

export interface MonthlyFlowPoint {
  /** Calendar month, YYYY-MM. */
  month: string;
  income: number;
  expense: number;
}

/** Runway snapshot (line-items.md §5 — company orgs; ledger-burn rule). */
export interface RunwaySnapshot {
  /** Months of runway; null when n/a. */
  months: number | null;
  /** "n/a — …" reason when months is null. */
  na_reason: string | null;
}

export interface MonthlyFlowReport {
  currency: string;
  /** Oldest → newest; the last entry is the current month (MTD). */
  items: MonthlyFlowPoint[];
  runway: RunwaySnapshot;
}

export interface CategoryTotal {
  category_id: string;
  total: number;
}

export interface CategoryTotalsReport {
  /** Month the totals cover, YYYY-MM. */
  month: string;
  /** Expense totals by category, largest first. */
  items: CategoryTotal[];
}
