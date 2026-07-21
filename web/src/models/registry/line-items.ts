/**
 * Canonical line-item vocabulary — docs/line-items.md §1–4, verbatim.
 * The closed mapping target for financial statements: free-form keys are
 * rejected (schema-as-boundary). Extending the vocabulary is a docs PR.
 */

import type { StatementKind } from "../statement";

export const BALANCE_SHEET_KEYS = [
  "cash_and_equivalents",
  "receivables",
  "inventory",
  "current_assets_other",
  "current_assets",
  "ppe",
  "intangibles",
  "noncurrent_assets_other",
  "total_assets",
  "payables",
  "short_term_debt",
  "current_liabilities_other",
  "current_liabilities",
  "long_term_debt",
  "noncurrent_liabilities_other",
  "total_liabilities",
  "share_capital",
  "retained_earnings",
  "equity",
] as const;

export const INCOME_STATEMENT_KEYS = [
  "revenue",
  "cogs",
  "gross_profit",
  "opex",
  "depreciation_amortization",
  "operating_profit",
  "interest_expense",
  "interest_income",
  "tax_expense",
  "net_income",
] as const;

export const CASH_FLOW_KEYS = [
  "cfo",
  "cfi",
  "cff",
  "capex",
  "net_change_in_cash",
] as const;

export type BalanceSheetKey = (typeof BALANCE_SHEET_KEYS)[number];
export type IncomeStatementKey = (typeof INCOME_STATEMENT_KEYS)[number];
export type CashFlowKey = (typeof CASH_FLOW_KEYS)[number];
export type CanonicalKey = BalanceSheetKey | IncomeStatementKey | CashFlowKey;

export const CANONICAL_KEYS: readonly CanonicalKey[] = [
  ...BALANCE_SHEET_KEYS,
  ...INCOME_STATEMENT_KEYS,
  ...CASH_FLOW_KEYS,
];

export const KEYS_BY_KIND: Record<StatementKind, readonly CanonicalKey[]> = {
  balance_sheet: BALANCE_SHEET_KEYS,
  income_statement: INCOME_STATEMENT_KEYS,
  cash_flow: CASH_FLOW_KEYS,
};

export const isCanonicalKey = (key: string): key is CanonicalKey =>
  (CANONICAL_KEYS as readonly string[]).includes(key);

/**
 * Derivation table (line-items.md §4): derived keys compute when absent and
 * cross-check when present (>1% divergence flags a mapping_warning).
 * `terms` are [key, sign] pairs: value = Σ sign × value(key).
 */
export interface Derivation {
  key: CanonicalKey;
  kind: StatementKind;
  formula: string;
  terms: Array<[CanonicalKey, 1 | -1]>;
}

export const DERIVATIONS: readonly Derivation[] = [
  {
    key: "current_assets",
    kind: "balance_sheet",
    formula:
      "cash_and_equivalents + receivables + inventory + current_assets_other",
    terms: [
      ["cash_and_equivalents", 1],
      ["receivables", 1],
      ["inventory", 1],
      ["current_assets_other", 1],
    ],
  },
  {
    key: "total_assets",
    kind: "balance_sheet",
    formula: "current_assets + ppe + intangibles + noncurrent_assets_other",
    terms: [
      ["current_assets", 1],
      ["ppe", 1],
      ["intangibles", 1],
      ["noncurrent_assets_other", 1],
    ],
  },
  {
    key: "current_liabilities",
    kind: "balance_sheet",
    formula: "payables + short_term_debt + current_liabilities_other",
    terms: [
      ["payables", 1],
      ["short_term_debt", 1],
      ["current_liabilities_other", 1],
    ],
  },
  {
    key: "total_liabilities",
    kind: "balance_sheet",
    formula:
      "current_liabilities + long_term_debt + noncurrent_liabilities_other",
    terms: [
      ["current_liabilities", 1],
      ["long_term_debt", 1],
      ["noncurrent_liabilities_other", 1],
    ],
  },
  {
    key: "equity",
    kind: "balance_sheet",
    formula: "share_capital + retained_earnings",
    terms: [
      ["share_capital", 1],
      ["retained_earnings", 1],
    ],
  },
  {
    key: "gross_profit",
    kind: "income_statement",
    formula: "revenue - cogs",
    terms: [
      ["revenue", 1],
      ["cogs", -1],
    ],
  },
  {
    key: "operating_profit",
    kind: "income_statement",
    // D&A rule: opex EXCLUDES D&A by definition; when D&A is not separable
    // it stays inside opex and this term is simply absent.
    formula: "gross_profit - opex - depreciation_amortization",
    terms: [
      ["gross_profit", 1],
      ["opex", -1],
      ["depreciation_amortization", -1],
    ],
  },
  {
    key: "net_income",
    kind: "income_statement",
    formula:
      "operating_profit + interest_income - interest_expense - tax_expense",
    terms: [
      ["operating_profit", 1],
      ["interest_income", 1],
      ["interest_expense", -1],
      ["tax_expense", -1],
    ],
  },
  {
    key: "net_change_in_cash",
    kind: "cash_flow",
    formula: "cfo + cfi + cff",
    terms: [
      ["cfo", 1],
      ["cfi", 1],
      ["cff", 1],
    ],
  },
];

/** Human labels for pickers and the StatementView. */
export const CANONICAL_KEY_LABELS: Record<CanonicalKey, string> = {
  cash_and_equivalents: "Cash & equivalents",
  receivables: "Receivables",
  inventory: "Inventory",
  current_assets_other: "Other current assets",
  current_assets: "Total current assets",
  ppe: "Property, plant & equipment",
  intangibles: "Intangibles",
  noncurrent_assets_other: "Other non-current assets",
  total_assets: "Total assets",
  payables: "Payables",
  short_term_debt: "Short-term debt",
  current_liabilities_other: "Other current liabilities",
  current_liabilities: "Total current liabilities",
  long_term_debt: "Long-term debt",
  noncurrent_liabilities_other: "Other non-current liabilities",
  total_liabilities: "Total liabilities",
  share_capital: "Share capital",
  retained_earnings: "Retained earnings",
  equity: "Total equity",
  revenue: "Revenue",
  cogs: "Cost of sales",
  gross_profit: "Gross profit",
  opex: "Operating expenses",
  depreciation_amortization: "Depreciation & amortization",
  operating_profit: "Operating profit",
  interest_expense: "Interest expense",
  interest_income: "Interest income",
  tax_expense: "Tax expense",
  net_income: "Net income",
  cfo: "Net cash from operating activities",
  cfi: "Net cash from investing activities",
  cff: "Net cash from financing activities",
  capex: "Purchase of PP&E",
  net_change_in_cash: "Net change in cash",
};

/** Identity + threshold constants (line-items.md §4). */
export const IDENTITY_TOLERANCE = 0.01; // ±1%
export const UNMAPPED_VALUE_THRESHOLD = 0.2; // >20% unmapped value blocks confirm
/** AI suggestions under this confidence arrive unmapped, never guessed. */
export const SUGGESTION_CONFIDENCE_FLOOR = 0.6;

/** Period grammar (line-items.md §6) — closed; YYYY-MM reserved, rejected. */
export const PERIOD_PATTERN = /^(\d{4}-Q[1-4]|\d{4}-H[12]|FY\d{4})$/;

/** Previous same-kind period (growth rules: never mixed granularity). */
export const previousPeriod = (period: string): string | null => {
  const q = period.match(/^(\d{4})-Q([1-4])$/);
  if (q) {
    const year = Number(q[1]);
    const quarter = Number(q[2]);
    return quarter === 1 ? `${year - 1}-Q4` : `${year}-Q${quarter - 1}`;
  }
  const h = period.match(/^(\d{4})-H([12])$/);
  if (h) {
    const year = Number(h[1]);
    return h[2] === "1" ? `${year - 1}-H2` : `${year}-H1`;
  }
  const fy = period.match(/^FY(\d{4})$/);
  if (fy) return `FY${Number(fy[1]) - 1}`;
  return null;
};

/** Annualization factor by period token kind (line-items.md §5). */
export const annualizationFactor = (period: string): number => {
  if (/^\d{4}-Q[1-4]$/.test(period)) return 4;
  if (/^\d{4}-H[12]$/.test(period)) return 2;
  return 1; // FYYYYY
};

/** Actual day count of a period (receivables days uses this, not 365). */
export const periodDayCount = (period: string, fyEndYear?: number): number => {
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const qMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (qMatch) {
    const y = Number(qMatch[1]);
    const days = [
      isLeap(y) ? 91 : 90, // Q1
      91, // Q2
      92, // Q3
      92, // Q4
    ];
    return days[Number(qMatch[2]) - 1];
  }
  const hMatch = period.match(/^(\d{4})-H([12])$/);
  if (hMatch) {
    const y = Number(hMatch[1]);
    return hMatch[2] === "1" ? (isLeap(y) ? 182 : 181) : 184;
  }
  const fyMatch = period.match(/^FY(\d{4})$/);
  if (fyMatch) {
    const y = fyEndYear ?? Number(fyMatch[1]);
    return isLeap(y) ? 366 : 365;
  }
  return 365;
};
