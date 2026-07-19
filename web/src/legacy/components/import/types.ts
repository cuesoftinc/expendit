export interface Category {
  id: string;
  name: string;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}

export interface ImportSummary {
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  by_category: Record<string, number>;
  monthly_trends: MonthlyTrend[];
}

export type AnomalyType =
  | "large_transaction"
  | "spending_spike"
  | "abnormal_category"
  | "duplicate_charge";

export interface Anomaly {
  type: AnomalyType;
  description: string;
  amount?: number;
  category?: string;
}

export interface ImportJob {
  id: string;
  userid: string;
  status: "processing" | "completed" | "failed";
  file_name: string;
  file_type: string;
  total_parsed: number;
  duplicates_found: number;
  imported: number;
  created_at: string;
  completed_at?: string;
  error?: string;
  summary?: ImportSummary;
  ai_summary?: string;
  anomalies: Anomaly[];
}

export interface ImportedTransaction {
  id: string;
  import_job_id: string;
  userid: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: "expense" | "income";
  is_duplicate: boolean;
  fingerprint: string;
  confirmed: boolean;
}

export interface ImportResult {
  job: ImportJob;
  transactions: ImportedTransaction[];
}

export type ImportStep = "upload" | "review" | "done";

export interface Currency {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCIES: Currency[] = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira (₦)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling (KSh)" },
  { code: "GHS", symbol: "₵", label: "Ghanaian Cedi (₵)" },
  { code: "ZAR", symbol: "R", label: "South African Rand (R)" },
  { code: "EGP", symbol: "E£", label: "Egyptian Pound (E£)" },
];
