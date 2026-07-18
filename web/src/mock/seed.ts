/**
 * Seed narrative — the docs-coherent dataset ("today" = 20 Jul 2026):
 *
 * - Cuesoft Ltd company org (Lekki, Lagos — NG-LA) + the personal org.
 * - Bank links: GTBank ···0482, Zenith ···3306 (auto-confirm),
 *   Access ···7719 (reauth_required).
 * - Ledger: July MTD income ₦8,435,200 / expenses ₦3,614,800; Apr–Jun
 *   net-negative months averaging ₦2,450,000 burn → with FY2025 cash
 *   ₦17,640,000, runway = 7.2 months (line-items.md §5 ledger-burn rule).
 * - FY2025 balance sheet + income statement, identity-consistent
 *   (46.5m = 19.75m + 26.75m).
 * - June vatable income ₦9,116,000 → output VAT ₦636,000; recoverable
 *   input VAT ₦85,400 → VAT 2026-06 net ₦550,600, FIRS, due 21 Jul (T-1).
 * - Staged import job: 214 parsed / 209 to import / 5 duplicates.
 */

import type {
  Anomaly,
  BankLink,
  Category,
  ConsentRecord,
  FinStatement,
  ImportJob,
  LineItem,
  Member,
  Org,
  StagedTransaction,
  TaxFiling,
  TaxProfile,
  TxnDirection,
  TxnEntry,
  TxnSource,
  ReportArtifact,
} from "@/models";
import type { CanonicalKey } from "@/models/registry/line-items";
import { FIRS } from "@/models/registry/authorities";
import type { MockDb } from "./db";

export const ORG_PERSONAL = "org-personal";
export const ORG_CUESOFT = "org-cuesoft";
export const USER_IBUKUN = "user-ibukun";
export const STAGED_JOB_ID = "job-staged-gtb-june";

/** Deterministic PRNG (mulberry32) so the 214 staged rows never change. */
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const orgs: Org[] = [
  {
    id: ORG_PERSONAL,
    name: "Personal",
    kind: "personal",
    currency: "NGN",
    country: "NG",
    fiscal_year_end: "12-31",
    created_at: "2025-11-03T09:00:00.000Z",
  },
  {
    id: ORG_CUESOFT,
    name: "Cuesoft Ltd",
    kind: "company",
    currency: "NGN",
    country: "NG",
    fiscal_year_end: "12-31",
    registered_address: {
      line1: "12 Admiralty Way",
      city: "Lekki",
      state: "NG-LA",
      country: "NG",
    },
    created_at: "2025-11-03T09:05:00.000Z",
  },
];

const members: Member[] = [
  {
    org_id: ORG_PERSONAL,
    user_id: USER_IBUKUN,
    name: "Ibukun Dairo",
    email: "ibukun.o.dairo@gmail.com",
    role: "owner",
    status: "active",
    joined_at: "2025-11-03T09:00:00.000Z",
  },
  {
    org_id: ORG_CUESOFT,
    user_id: USER_IBUKUN,
    name: "Ibukun Dairo",
    email: "ibukun.o.dairo@gmail.com",
    role: "owner",
    status: "active",
    joined_at: "2025-11-03T09:05:00.000Z",
  },
  {
    org_id: ORG_CUESOFT,
    user_id: "user-adaeze",
    name: "Adaeze Okafor",
    email: "adaeze@cuesoft.io",
    role: "admin",
    status: "active",
    joined_at: "2025-12-01T10:00:00.000Z",
  },
  {
    org_id: ORG_CUESOFT,
    user_id: "user-tunde",
    name: "Tunde Bakare",
    email: "tunde@cuesoft.io",
    role: "member",
    status: "active",
    joined_at: "2026-02-16T10:00:00.000Z",
  },
  {
    org_id: ORG_CUESOFT,
    user_id: "user-invite-finance",
    name: "",
    email: "finance@cuesoft.io",
    role: "member",
    status: "pending",
    joined_at: null,
  },
];

/** Category colors are user data, not design tokens. */
const categories: Category[] = [
  // Cuesoft Ltd — income
  {
    id: "cat-consulting",
    org_id: ORG_CUESOFT,
    name: "Consulting income",
    type: "income",
    color: "#1B7F4B",
    tax_treatment: "taxable_income",
    vat_treatment: "vatable",
    vat_basis: "inclusive",
  },
  {
    id: "cat-product",
    org_id: ORG_CUESOFT,
    name: "Product revenue",
    type: "income",
    color: "#2456D6",
    tax_treatment: "taxable_income",
    vat_treatment: "vatable",
    vat_basis: "inclusive",
  },
  {
    id: "cat-workshops",
    org_id: ORG_CUESOFT,
    name: "Workshops & training",
    type: "income",
    color: "#7DA2FF",
    tax_treatment: "taxable_income",
    vat_treatment: "vatable",
    vat_basis: "inclusive",
  },
  // Cuesoft Ltd — expenses
  {
    id: "cat-payroll",
    org_id: ORG_CUESOFT,
    name: "Payroll",
    type: "expense",
    color: "#C6373C",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-rent",
    org_id: ORG_CUESOFT,
    name: "Office rent",
    type: "expense",
    color: "#B26A00",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-cloud",
    org_id: ORG_CUESOFT,
    name: "Cloud & software",
    type: "expense",
    color: "#F46A1F",
    tax_treatment: "ignore",
    vat_treatment: "vatable",
    vat_basis: "inclusive",
  },
  {
    id: "cat-comms",
    org_id: ORG_CUESOFT,
    name: "Internet & comms",
    type: "expense",
    color: "#6E6E76",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-transport",
    org_id: ORG_CUESOFT,
    name: "Fuel & transport",
    type: "expense",
    color: "#8B5CF6",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-ops",
    org_id: ORG_CUESOFT,
    name: "Ops & logistics",
    type: "expense",
    color: "#0EA5E9",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-meals",
    org_id: ORG_CUESOFT,
    name: "Meals & team",
    type: "expense",
    color: "#F59E0B",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  // Personal org
  {
    id: "cat-personal-income",
    org_id: ORG_PERSONAL,
    name: "Dividends & fees",
    type: "income",
    color: "#1B7F4B",
    tax_treatment: "taxable_income",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-personal-living",
    org_id: ORG_PERSONAL,
    name: "Living expenses",
    type: "expense",
    color: "#C6373C",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
];

interface TxnSeed {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: TxnDirection;
  category: string;
  source: TxnSource;
  link?: string;
  ai?: boolean;
  anomalies?: Anomaly[];
}

const cuesoftTxns: TxnSeed[] = [
  // ---- July 2026 MTD — income ₦8,435,200 -------------------------------
  {
    id: "txn-2607-01",
    date: "2026-07-03",
    description: "Retainer — Kudaworks",
    amount: 3_200_000,
    direction: "income",
    category: "cat-consulting",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2607-02",
    date: "2026-07-08",
    description: "Invoice #2041 — Nairaflow",
    amount: 2_850_000,
    direction: "income",
    category: "cat-product",
    source: "csv",
    anomalies: [
      {
        rule_id: "large_transaction",
        severity: "warn",
        note: "₦2,850,000 is 5.2× the trailing-90-day income median (₦545,000).",
      },
    ],
  },
  {
    id: "txn-2607-03",
    date: "2026-07-15",
    description: "Consulting — BlueRidge Capital",
    amount: 1_585_200,
    direction: "income",
    category: "cat-consulting",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2607-04",
    date: "2026-07-18",
    description: "Workshop facilitation — DataCamp Lagos",
    amount: 800_000,
    direction: "income",
    category: "cat-workshops",
    source: "manual",
  },
  // ---- July 2026 MTD — expenses ₦3,614,800 ------------------------------
  {
    id: "txn-2607-05",
    date: "2026-07-01",
    description: "Office rent — July",
    amount: 650_000,
    direction: "expense",
    category: "cat-rent",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2607-06",
    date: "2026-07-06",
    description: "AWS hosting",
    amount: 438_700,
    direction: "expense",
    category: "cat-cloud",
    source: "bank",
    link: "link-gtb",
    ai: true,
    anomalies: [
      {
        rule_id: "spending_spike",
        severity: "warn",
        note: "Cloud & software is ₦603,000 this month vs μ+2σ = ₦512,400 over the trailing 6 months.",
      },
    ],
  },
  {
    id: "txn-2607-07",
    date: "2026-07-07",
    description: "Internet & comms — Q3 bundle",
    amount: 186_500,
    direction: "expense",
    category: "cat-comms",
    source: "bank",
    link: "link-access",
  },
  {
    id: "txn-2607-08",
    date: "2026-07-10",
    description: "Software subscriptions",
    amount: 164_300,
    direction: "expense",
    category: "cat-cloud",
    source: "csv",
    ai: true,
  },
  {
    id: "txn-2607-09",
    date: "2026-07-12",
    description: "Fuel & transport",
    amount: 145_000,
    direction: "expense",
    category: "cat-transport",
    source: "receipt",
  },
  {
    id: "txn-2607-10",
    date: "2026-07-14",
    description: "Equipment repair — office AC",
    amount: 95_300,
    direction: "expense",
    category: "cat-ops",
    source: "receipt",
    anomalies: [
      {
        rule_id: "abnormal_category",
        severity: "info",
        note: "₦95,300 is 3.4× the trailing mean for Ops & logistics (₦28,000).",
      },
    ],
  },
  {
    id: "txn-2607-11",
    date: "2026-07-16",
    description: "Team lunch — sprint close",
    amount: 85_000,
    direction: "expense",
    category: "cat-meals",
    source: "manual",
  },
  {
    id: "txn-2607-12",
    date: "2026-07-18",
    description: "Payroll — July",
    amount: 1_850_000,
    direction: "expense",
    category: "cat-payroll",
    source: "bank",
    link: "link-zenith",
  },
  // ---- June 2026 — income ₦9,116,000 (all vatable → output VAT 636,000) --
  {
    id: "txn-2606-01",
    date: "2026-06-04",
    description: "Retainer — Kudaworks",
    amount: 3_200_000,
    direction: "income",
    category: "cat-consulting",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2606-02",
    date: "2026-06-12",
    description: "Invoice #1987 — Nairaflow",
    amount: 3_916_000,
    direction: "income",
    category: "cat-product",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2606-03",
    date: "2026-06-20",
    description: "Consulting — Helios Energy",
    amount: 2_000_000,
    direction: "income",
    category: "cat-consulting",
    source: "bank",
    link: "link-zenith",
  },
  // ---- June 2026 — expenses ₦11,516,000 (net −2,400,000) -----------------
  {
    id: "txn-2606-04",
    date: "2026-06-01",
    description: "Office rent — June",
    amount: 650_000,
    direction: "expense",
    category: "cat-rent",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2606-05",
    date: "2026-06-09",
    description: "Cloud infrastructure — annual reserve",
    amount: 730_000,
    direction: "expense",
    category: "cat-cloud",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2606-06",
    date: "2026-06-15",
    description: "Ops & logistics — device fleet",
    amount: 1_900_000,
    direction: "expense",
    category: "cat-ops",
    source: "bank",
    link: "link-access",
  },
  {
    id: "txn-2606-07",
    date: "2026-06-18",
    description: "Software licences — design suite",
    amount: 494_067,
    direction: "expense",
    category: "cat-cloud",
    source: "csv",
    ai: true,
  },
  {
    id: "txn-2606-08",
    date: "2026-06-22",
    description: "Marketing sprint — GA launch",
    amount: 1_241_933,
    direction: "expense",
    category: "cat-ops",
    source: "bank",
    link: "link-zenith",
  },
  {
    id: "txn-2606-09",
    date: "2026-06-27",
    description: "Payroll — June",
    amount: 6_500_000,
    direction: "expense",
    category: "cat-payroll",
    source: "bank",
    link: "link-zenith",
  },
  // ---- May 2026 — income 6,200,000 / expenses 8,540,000 (net −2,340,000) --
  {
    id: "txn-2605-01",
    date: "2026-05-06",
    description: "Retainer — Kudaworks",
    amount: 3_200_000,
    direction: "income",
    category: "cat-consulting",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2605-02",
    date: "2026-05-19",
    description: "Invoice #1899 — Nairaflow",
    amount: 3_000_000,
    direction: "income",
    category: "cat-product",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2605-03",
    date: "2026-05-01",
    description: "Office rent — May",
    amount: 650_000,
    direction: "expense",
    category: "cat-rent",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2605-04",
    date: "2026-05-10",
    description: "Cloud & software",
    amount: 690_000,
    direction: "expense",
    category: "cat-cloud",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2605-05",
    date: "2026-05-16",
    description: "Ops & logistics",
    amount: 900_000,
    direction: "expense",
    category: "cat-ops",
    source: "bank",
    link: "link-access",
  },
  {
    id: "txn-2605-06",
    date: "2026-05-28",
    description: "Payroll — May",
    amount: 6_300_000,
    direction: "expense",
    category: "cat-payroll",
    source: "bank",
    link: "link-zenith",
  },
  // ---- April 2026 — income 6,000,000 / expenses 8,610,000 (net −2,610,000)
  {
    id: "txn-2604-01",
    date: "2026-04-07",
    description: "Retainer — Kudaworks",
    amount: 3_200_000,
    direction: "income",
    category: "cat-consulting",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2604-02",
    date: "2026-04-21",
    description: "Invoice #1820 — Nairaflow",
    amount: 2_800_000,
    direction: "income",
    category: "cat-product",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2604-03",
    date: "2026-04-01",
    description: "Office rent — April",
    amount: 650_000,
    direction: "expense",
    category: "cat-rent",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2604-04",
    date: "2026-04-09",
    description: "Cloud & software",
    amount: 660_000,
    direction: "expense",
    category: "cat-cloud",
    source: "bank",
    link: "link-gtb",
  },
  {
    id: "txn-2604-05",
    date: "2026-04-15",
    description: "Ops & logistics",
    amount: 1_000_000,
    direction: "expense",
    category: "cat-ops",
    source: "bank",
    link: "link-access",
  },
  {
    id: "txn-2604-06",
    date: "2026-04-28",
    description: "Payroll — April",
    amount: 6_300_000,
    direction: "expense",
    category: "cat-payroll",
    source: "bank",
    link: "link-zenith",
  },
];

/** Personal org — 2026 YTD gross ₦5,400,000 (PIT-2026 estimate ₦762,000). */
const personalTxns: TxnSeed[] = [
  {
    id: "txn-p-01",
    date: "2026-02-10",
    description: "Dividend — Cuesoft Ltd",
    amount: 1_800_000,
    direction: "income",
    category: "cat-personal-income",
    source: "manual",
  },
  {
    id: "txn-p-02",
    date: "2026-04-15",
    description: "Advisory fee — Delta Ventures",
    amount: 1_600_000,
    direction: "income",
    category: "cat-personal-income",
    source: "manual",
  },
  {
    id: "txn-p-03",
    date: "2026-06-30",
    description: "Dividend — Cuesoft Ltd",
    amount: 2_000_000,
    direction: "income",
    category: "cat-personal-income",
    source: "manual",
  },
  {
    id: "txn-p-04",
    date: "2026-07-05",
    description: "Rent — Lekki apartment",
    amount: 950_000,
    direction: "expense",
    category: "cat-personal-living",
    source: "manual",
  },
];

const toTxn = (seedRow: TxnSeed, orgId: string): TxnEntry => ({
  id: seedRow.id,
  org_id: orgId,
  description: seedRow.description,
  amount: seedRow.amount,
  direction: seedRow.direction,
  category_id: seedRow.category,
  txn_date: seedRow.date,
  source: seedRow.source,
  source_link_id: seedRow.link ?? null,
  ai_categorized: seedRow.ai ?? false,
  excluded_from_reports: false,
  anomalies: seedRow.anomalies ?? [],
  created_at: `${seedRow.date}T09:00:00.000Z`,
});

const bankLinks: BankLink[] = [
  {
    id: "link-gtb",
    org_id: ORG_CUESOFT,
    provider: "mono",
    institution: "GTBank",
    masked_account: "···0482",
    status: "active",
    last_synced_at: "2026-07-20T05:02:00.000Z",
    auto_confirm: false,
    imported_txn_count: 132,
    created_at: "2026-01-12T08:00:00.000Z",
  },
  {
    id: "link-zenith",
    org_id: ORG_CUESOFT,
    provider: "mono",
    institution: "Zenith Bank",
    masked_account: "···3306",
    status: "active",
    last_synced_at: "2026-07-20T04:41:00.000Z",
    auto_confirm: true,
    imported_txn_count: 87,
    created_at: "2026-02-03T08:00:00.000Z",
  },
  {
    id: "link-access",
    org_id: ORG_CUESOFT,
    provider: "mono",
    institution: "Access Bank",
    masked_account: "···7719",
    status: "reauth_required",
    last_synced_at: "2026-07-12T04:58:00.000Z",
    auto_confirm: false,
    imported_txn_count: 43,
    created_at: "2026-03-19T08:00:00.000Z",
  },
];

/** The 214/209/5 staged review job (MI-2 "214 transactions found"). */
const buildStagedRows = (): StagedTransaction[] => {
  const rand = mulberry32(20260720);
  const merchants = [
    "POS — Shoprite Lekki",
    "Transfer — Chidinma A.",
    "Uber trip",
    "Bolt trip",
    "MTN airtime",
    "Netflix subscription",
    "The Place — lunch",
    "Filmhouse Cinemas",
    "Jumia order",
    "Total filling station",
    "Ikeja Electric prepaid",
    "Chicken Republic",
    "Spotify subscription",
    "Interswitch — POS settlement",
    "ATM withdrawal — GTB Lekki",
    "Transfer — invoice payment",
    "DSTV subscription",
    "Medplus pharmacy",
    "Cafe Neo",
    "Printivo — print order",
  ];
  const expenseCats = [
    "cat-ops",
    "cat-transport",
    "cat-meals",
    "cat-comms",
    "cat-cloud",
  ];
  const rows: StagedTransaction[] = [];
  for (let i = 0; i < 214; i += 1) {
    const isIncome = rand() < 0.12;
    const day = 1 + Math.floor(rand() * 30);
    const merchant = merchants[Math.floor(rand() * merchants.length)];
    const amount = isIncome
      ? Math.round((150_000 + rand() * 1_450_000) / 100) * 100
      : Math.round((1_500 + rand() * 240_000) / 100) * 100;
    // Exactly 5 duplicates: rows 30/74/118/162/206 (MI-3 "discard 5").
    const isDuplicate = i % 44 === 30;
    rows.push({
      id: `staged-gtb-${(i + 1).toString().padStart(3, "0")}`,
      job_id: STAGED_JOB_ID,
      description: isIncome ? "Transfer in — client payment" : merchant,
      amount,
      direction: isIncome ? "income" : "expense",
      category_id: isIncome
        ? "cat-consulting"
        : expenseCats[Math.floor(rand() * expenseCats.length)],
      ai_categorized: rand() < 0.85,
      is_duplicate: isDuplicate,
      include_duplicate: false,
      txn_date: `2026-06-${day.toString().padStart(2, "0")}`,
    });
  }
  return rows;
};

const importJobs: ImportJob[] = [
  {
    id: STAGED_JOB_ID,
    org_id: ORG_CUESOFT,
    source: "upload",
    status: "completed",
    file_name: "gtbank-statement-june-2026.csv",
    file_type: "csv",
    total_parsed: 214,
    duplicates_found: 5,
    imported: 0,
    summary: {
      total_income: 4_812_400,
      total_expense: 9_318_200,
      net: -4_505_800,
      by_category: {
        "cat-ops": 3_614_100,
        "cat-transport": 1_502_600,
        "cat-meals": 1_281_700,
        "cat-comms": 1_119_800,
        "cat-cloud": 1_800_000,
      },
    },
    ai_summary:
      "214 transactions found in the June GTBank statement. Spending is concentrated in ops and transport; 5 rows look like duplicates of entries already in your ledger.",
    anomalies: [
      {
        rule_id: "duplicate_charge",
        severity: "warn",
        note: "5 staged rows match ledger entries on date ±1d, exact amount and description.",
      },
    ],
    warnings: [],
    error_code: null,
    confirmed: false,
    created_at: "2026-07-20T09:12:00.000Z",
    completed_at: "2026-07-20T09:13:20.000Z",
  },
  {
    id: "job-hist-may",
    org_id: ORG_CUESOFT,
    source: "upload",
    status: "completed",
    file_name: "gtbank-statement-may-2026.csv",
    file_type: "csv",
    total_parsed: 156,
    duplicates_found: 3,
    imported: 153,
    summary: {
      total_income: 6_200_000,
      total_expense: 8_540_000,
      net: -2_340_000,
      by_category: { "cat-payroll": 6_300_000, "cat-ops": 900_000 },
    },
    ai_summary: "May ledger import completed — payroll dominates outflows.",
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: true,
    created_at: "2026-06-02T10:00:00.000Z",
    completed_at: "2026-06-02T10:01:10.000Z",
  },
  {
    id: "job-hist-sync",
    org_id: ORG_CUESOFT,
    source: "bank_sync",
    status: "completed",
    file_name: null,
    file_type: null,
    total_parsed: 12,
    duplicates_found: 0,
    imported: 12,
    summary: {
      total_income: 1_585_200,
      total_expense: 331_800,
      net: 1_253_400,
      by_category: { "cat-consulting": 1_585_200 },
    },
    ai_summary: null,
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: true,
    created_at: "2026-07-19T04:40:00.000Z",
    completed_at: "2026-07-19T04:40:30.000Z",
  },
  {
    id: "job-failed-pdf",
    org_id: ORG_CUESOFT,
    source: "upload",
    status: "failed",
    file_name: "access-statement-may.pdf",
    file_type: "pdf",
    total_parsed: 0,
    duplicates_found: 0,
    imported: 0,
    summary: null,
    ai_summary: null,
    anomalies: [],
    warnings: [],
    error_code: "password_protected_pdf",
    confirmed: false,
    created_at: "2026-06-05T11:00:00.000Z",
    completed_at: "2026-06-05T11:00:40.000Z",
  },
];

/** FY2025 statements — identity-consistent (46.5m = 19.75m + 26.75m). */
const BS_FY2025: Array<[CanonicalKey, number, boolean]> = [
  ["cash_and_equivalents", 17_640_000, false],
  ["receivables", 6_850_000, false],
  ["inventory", 2_100_000, false],
  ["current_assets_other", 910_000, false],
  ["current_assets", 27_500_000, true],
  ["ppe", 14_200_000, false],
  ["intangibles", 3_600_000, false],
  ["noncurrent_assets_other", 1_200_000, false],
  ["total_assets", 46_500_000, true],
  ["payables", 6_200_000, false],
  ["short_term_debt", 2_500_000, false],
  ["current_liabilities_other", 2_300_000, false],
  ["current_liabilities", 11_000_000, true],
  ["long_term_debt", 7_750_000, false],
  ["noncurrent_liabilities_other", 1_000_000, false],
  ["total_liabilities", 19_750_000, true],
  ["share_capital", 10_000_000, false],
  ["retained_earnings", 16_750_000, false],
  ["equity", 26_750_000, true],
];

const IS_FY2025: Array<[CanonicalKey, number, boolean]> = [
  ["revenue", 128_400_000, false],
  ["cogs", 61_900_000, false],
  ["gross_profit", 66_500_000, true],
  ["opex", 44_400_000, false],
  ["depreciation_amortization", 3_900_000, false],
  ["operating_profit", 18_200_000, true],
  ["interest_expense", 1_450_000, false],
  ["interest_income", 250_000, false],
  ["tax_expense", 4_800_000, false],
  ["net_income", 12_200_000, true],
];

const SOURCE_LABELS: Partial<Record<CanonicalKey, string>> = {
  cash_and_equivalents: "Cash and bank balances",
  receivables: "Trade debtors",
  inventory: "Stock",
  current_assets_other: "Prepayments",
  ppe: "Property, plant and equipment (net)",
  intangibles: "Software and licences",
  noncurrent_assets_other: "Deferred tax assets",
  payables: "Trade creditors",
  short_term_debt: "Current portion of loans",
  current_liabilities_other: "Accruals and taxes payable",
  long_term_debt: "Term loans",
  noncurrent_liabilities_other: "Provisions",
  share_capital: "Issued share capital",
  retained_earnings: "Accumulated profits",
  revenue: "Turnover",
  cogs: "Cost of sales",
  opex: "Administrative and selling expenses",
  depreciation_amortization: "Depreciation and amortisation",
  interest_expense: "Finance costs",
  interest_income: "Investment income",
  tax_expense: "Income tax expense",
};

const buildLineItems = (
  statementId: string,
  rows: Array<[CanonicalKey, number, boolean]>,
): LineItem[] =>
  rows.map(([key, amount, derived], index) => ({
    id: `${statementId}-li-${(index + 1).toString().padStart(2, "0")}`,
    statement_id: statementId,
    canonical_key: key,
    source_label: derived ? "" : (SOURCE_LABELS[key] ?? key),
    amount,
    status: "mapped",
    confidence: derived ? null : 0.97,
    mapped_by: derived ? "user" : "ai",
    derived,
  }));

const statements: FinStatement[] = [
  {
    id: "stmt-bs-fy2025",
    org_id: ORG_CUESOFT,
    kind: "balance_sheet",
    period: "FY2025",
    currency: "NGN",
    source_file_type: "xlsx",
    mapping_status: "confirmed",
    superseded_by: null,
    mapping_warnings: [],
    created_at: "2026-03-14T09:30:00.000Z",
    confirmed_at: "2026-03-14T10:05:00.000Z",
  },
  {
    id: "stmt-is-fy2025",
    org_id: ORG_CUESOFT,
    kind: "income_statement",
    period: "FY2025",
    currency: "NGN",
    source_file_type: "xlsx",
    mapping_status: "confirmed",
    superseded_by: null,
    mapping_warnings: [],
    created_at: "2026-03-14T09:32:00.000Z",
    confirmed_at: "2026-03-14T10:08:00.000Z",
  },
  {
    id: "stmt-bs-2026q2",
    org_id: ORG_CUESOFT,
    kind: "balance_sheet",
    period: "2026-Q2",
    currency: "NGN",
    source_file_type: "pdf",
    mapping_status: "staged",
    superseded_by: null,
    mapping_warnings: [],
    created_at: "2026-07-18T15:20:00.000Z",
    confirmed_at: null,
  },
];

/** Staged Q2 mapping — mixed suggested/confirmed/unmapped for review UX. */
const stagedQ2LineItems: LineItem[] = [
  {
    id: "stmt-bs-2026q2-li-01",
    statement_id: "stmt-bs-2026q2",
    canonical_key: "cash_and_equivalents",
    source_label: "Cash at bank and in hand",
    amount: 15_900_000,
    status: "mapped",
    confidence: 0.96,
    mapped_by: "ai",
    derived: false,
  },
  {
    id: "stmt-bs-2026q2-li-02",
    statement_id: "stmt-bs-2026q2",
    canonical_key: "receivables",
    source_label: "Amounts owed by customers",
    amount: 7_400_000,
    status: "mapped",
    confidence: 0.88,
    mapped_by: "ai",
    derived: false,
  },
  {
    id: "stmt-bs-2026q2-li-03",
    statement_id: "stmt-bs-2026q2",
    canonical_key: null,
    source_label: "Sundry balances",
    amount: 640_000,
    status: "unmapped",
    confidence: 0.41,
    mapped_by: "ai",
    derived: false,
  },
  {
    id: "stmt-bs-2026q2-li-04",
    statement_id: "stmt-bs-2026q2",
    canonical_key: "payables",
    source_label: "Trade creditors",
    amount: 5_100_000,
    status: "mapped",
    confidence: null,
    mapped_by: "user",
    derived: false,
  },
];

const taxProfiles: TaxProfile[] = [
  {
    id: "taxprofile-personal",
    org_id: ORG_PERSONAL,
    jurisdiction: "NG",
    taxpayer_kind: "individual",
    tin: null, // filing generate → 422 tax_identity_incomplete
    state_of_residence: "NG-LA", // PIT → LIRS (tax-engine.md §5.5)
    rc_number: null,
    nin: null,
    category_treatments: {
      "cat-personal-income": {
        tax_treatment: "taxable_income",
        vat_treatment: "exempt",
        vat_basis: "inclusive",
      },
    },
  },
  {
    id: "taxprofile-cuesoft",
    org_id: ORG_CUESOFT,
    jurisdiction: "NG",
    taxpayer_kind: "company",
    tin: "TIN-04521998-0001",
    state_of_residence: null,
    rc_number: "RC 1523904",
    nin: null,
    category_treatments: Object.fromEntries(
      categories
        .filter((cat) => cat.org_id === ORG_CUESOFT)
        .map((cat) => [
          cat.id,
          {
            tax_treatment: cat.tax_treatment,
            vat_treatment: cat.vat_treatment,
            vat_basis: cat.vat_basis,
          },
        ]),
    ),
  },
];

const taxFilings: TaxFiling[] = [
  {
    id: "filing-cit-fy2025",
    org_id: ORG_CUESOFT,
    kind: "cit",
    period: "FY2025",
    status: "submitted",
    amount_due: 5_474_000,
    due_date: "2026-06-30",
    computed_fields: [
      {
        key: "assessable_profit",
        label: "Assessable profit",
        value: 16_100_000,
        formula: "net_income + depreciation add-back",
        inputs: ["stmt-is-fy2025-li-10", "stmt-is-fy2025-li-05"],
        notes: ["Adjustments worksheet: depreciation add-back ₦3,900,000"],
      },
      {
        key: "cit",
        label: "Company income tax (30%)",
        value: 4_830_000,
        formula: "assessable_profit × 0.30",
        inputs: [],
        notes: ["Classification: other (turnover ₦128.4m > ₦100m)"],
      },
      {
        key: "development_levy",
        label: "Development levy (4%)",
        value: 644_000,
        formula: "assessable_profit × 0.04",
        inputs: [],
        notes: [],
      },
    ],
    authority: FIRS,
    artifact_key: "filings/cit-fy2025-cuesoft.zip",
    filed_at: "2026-06-12T14:20:00.000Z",
    created_at: "2026-06-10T09:00:00.000Z",
  },
  {
    id: "filing-vat-2026-05",
    org_id: ORG_CUESOFT,
    kind: "vat",
    period: "2026-05",
    status: "submitted",
    amount_due: 512_300,
    due_date: "2026-06-21",
    computed_fields: [
      {
        key: "output_vat",
        label: "Output VAT",
        value: 578_500,
        formula: "vatable income × 7.5/107.5 (inclusive)",
        inputs: [],
        notes: [],
      },
      {
        key: "input_vat",
        label: "Recoverable input VAT",
        value: 66_200,
        formula: "vatable expenses × 7.5/107.5 (inclusive)",
        inputs: [],
        notes: ["Fully recoverable — all supplies vatable"],
      },
      {
        key: "net_vat",
        label: "Net VAT position",
        value: 512_300,
        formula: "output − recoverable input",
        inputs: [],
        notes: [],
      },
    ],
    authority: FIRS,
    artifact_key: "filings/vat-2026-05-cuesoft.zip",
    filed_at: "2026-06-19T10:40:00.000Z",
    created_at: "2026-06-18T09:00:00.000Z",
  },
];

const artifacts: ReportArtifact[] = [
  {
    id: "artifact-monthly-jun",
    org_id: ORG_CUESOFT,
    kind: "monthly_summary",
    format: "pdf",
    period: "2026-06",
    params: {},
    status: "ready",
    signed_url: "/api/mock/reports/artifact-monthly-jun/download",
    created_at: "2026-07-02T08:15:00.000Z",
    expires_at: "2026-08-01T08:15:00.000Z",
  },
  {
    id: "artifact-deepdive-cloud",
    org_id: ORG_CUESOFT,
    kind: "category_deep_dive",
    format: "csv",
    period: "2026-06",
    params: { category: "cat-cloud" },
    status: "ready",
    signed_url: "/api/mock/reports/artifact-deepdive-cloud/download",
    created_at: "2026-07-20T09:40:00.000Z", // NEW ≤24h (MI-14)
    expires_at: "2026-08-19T09:40:00.000Z",
  },
  {
    id: "artifact-fs-fy2025",
    org_id: ORG_CUESOFT,
    kind: "financial_statement",
    format: "pdf",
    period: "FY2025",
    params: { statement_kind: "balance_sheet" },
    status: "ready",
    signed_url: "/api/mock/reports/artifact-fs-fy2025/download",
    created_at: "2026-07-01T12:00:00.000Z",
    expires_at: "2026-07-31T12:00:00.000Z",
  },
];

const consents: ConsentRecord[] = [
  {
    id: "consent-tos",
    user_id: USER_IBUKUN,
    document: "tos",
    version: "1.0",
    accepted_at: "2026-07-01T09:00:00.000Z",
  },
  {
    id: "consent-privacy",
    user_id: USER_IBUKUN,
    document: "privacy",
    version: "1.0",
    accepted_at: "2026-07-01T09:00:00.000Z",
  },
  {
    id: "consent-ai",
    user_id: USER_IBUKUN,
    document: "ai_processing",
    version: "1.0",
    accepted_at: "2026-07-01T09:00:10.000Z",
  },
];

export const buildSeed = (): MockDb => ({
  orgs: structuredClone(orgs),
  members: structuredClone(members),
  categories: structuredClone(categories),
  transactions: [
    ...cuesoftTxns.map((row) => toTxn(row, ORG_CUESOFT)),
    ...personalTxns.map((row) => toTxn(row, ORG_PERSONAL)),
  ],
  importJobs: structuredClone(importJobs),
  stagedTxns: buildStagedRows(),
  bankLinks: structuredClone(bankLinks),
  statements: structuredClone(statements),
  lineItems: [
    ...buildLineItems("stmt-bs-fy2025", BS_FY2025),
    ...buildLineItems("stmt-is-fy2025", IS_FY2025),
    ...structuredClone(stagedQ2LineItems),
  ],
  ratioReports: [],
  taxProfiles: structuredClone(taxProfiles),
  taxEstimates: [],
  taxFilings: structuredClone(taxFilings),
  artifacts: structuredClone(artifacts),
  consents: structuredClone(consents),
  exportJobs: [],
  purgeRequest: null,
  idempotency: {},
  lastManualSync: {},
  processingSince: {},
  seq: 1000,
});
