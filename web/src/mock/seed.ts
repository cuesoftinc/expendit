/**
 * Seed narrative — the docs-coherent dataset ("today" = 20 Jul 2026),
 * simulating seven months of actual usage (Jan–Jul 2026) for Cuesoft Ltd
 * (Lekki, Lagos — NG-LA) plus the owner's personal/freelancer org, whose
 * ledger spans the full trailing 12 months (Aug 2025 – Jul 2026: imported
 * statement history + live use — the B1 chart shows a complete year).
 *
 * The company story: a services + product studio that staffed up in April
 * ahead of its June GA launch — revenue grows every month while payroll
 * and launch spend push Apr–Jun into a deliberate burn.
 *
 * LOCKED invariants (docs + unit tests + Figma narrative):
 * - July MTD: income ₦8,435,200 / expenses ₦3,614,800.
 * - Runway 7.2 months: Apr/May/Jun nets −2,610,000 / −2,340,000 /
 *   −2,400,000 → avg burn 2,450,000; FY2025 cash 17,640,000 (ledger-burn
 *   rule, line-items.md §5).
 * - VAT 2026-06 (due 21 Jul, T-1): June income ₦9,116,000 all vatable →
 *   output 636,000; vatable expenses (Cloud & software) ₦1,224,067 →
 *   input 85,400; net ₦550,600 — FIRS.
 * - FY2025 statements identity-consistent (46.5m = 19.75m + 26.75m);
 *   CIT FY2025 filed: assessable 16.1m → 4.83m + 644k levy = 5,474,000.
 * - Staged import job: 214 parsed / 209 to import / 5 duplicates — the 5
 *   duplicates mirror the five June GTBank ledger rows that synced before
 *   the June GTB feed outage (the reason the statement was uploaded).
 *
 * Continuity threads (keep coherent when editing):
 * - Monthly VAT filing history Jan–May computes exactly from the ledger
 *   (income and cloud-spend sums are ×43/3-clean): 321,000 / 408,000 /
 *   465,000 / 444,000 / 540,000 — rising with revenue toward June's
 *   550,600 estimate.
 * - FY2024 statements (confirmed) tell the turnaround: a strained,
 *   loss-making FY2024 (current ratio 1.27 warning · debt ratio 0.68
 *   warning · interest coverage 1.3 critical · net −130,000) into the
 *   healthy FY2025 — powering trends, growth rows and the RatioGauge
 *   warning/critical/na states. RE continuity: 4,550,000 + 12,200,000
 *   FY2025 net = 16,750,000 ✓.
 * - FY2025 cash flow (confirmed): cfo 13.4m + cfi −6.1m + cff −1.9m =
 *   +5.4m = cash 12,240,000 (FY2024 BS) → 17,640,000 (FY2025 BS) ✓.
 * - Anomaly notes are computed from this dataset, not invented: income
 *   median (trailing 90d) 900,000; comms μ+2σ ≈ 98,000; ops
 *   per-transaction mean ≈ 33,000.
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
  // Cuesoft Ltd — income (all vatable: input VAT stays fully recoverable)
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
  // Cuesoft Ltd — expenses. Only Cloud & software is confirmed vatable —
  // the VAT input figures key on it (the org hasn't confirmed VAT
  // treatments for the other expense categories; theirs to confirm).
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
  {
    id: "cat-equipment",
    org_id: ORG_CUESOFT,
    name: "Equipment & assets",
    type: "expense",
    color: "#14B8A6",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-marketing",
    org_id: ORG_CUESOFT,
    name: "Marketing & growth",
    type: "expense",
    color: "#EC4899",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  // AI-proposed category awaiting confirmation (B8 frame row state):
  // courier/dispatch vendors clustered out of Ops & logistics.
  {
    id: "cat-ai-logistics",
    org_id: ORG_CUESOFT,
    name: "Logistics",
    type: "expense",
    color: "#6E6E76",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
    ai_proposed: true,
    ai_note: "AI proposed from 3 vendors",
  },
  // Personal org — the freelancer dataset
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
    id: "cat-personal-clients",
    org_id: ORG_PERSONAL,
    name: "Client projects",
    type: "income",
    color: "#2456D6",
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
  {
    id: "cat-personal-tools",
    org_id: ORG_PERSONAL,
    name: "Software & subscriptions",
    type: "expense",
    color: "#F46A1F",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-personal-transport",
    org_id: ORG_PERSONAL,
    name: "Transport & fuel",
    type: "expense",
    color: "#8B5CF6",
    tax_treatment: "ignore",
    vat_treatment: "exempt",
    vat_basis: "inclusive",
  },
  {
    id: "cat-personal-health",
    org_id: ORG_PERSONAL,
    name: "Health",
    type: "expense",
    color: "#0EA5E9",
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

/**
 * Compact month builder: [day, description, amount, direction, category,
 * source, opts?]. Ids are positional (txn-<yymm>-<nn>) and stable as long
 * as rows are appended, not reordered.
 */
type Row = [
  day: number,
  description: string,
  amount: number,
  direction: TxnDirection,
  category: string,
  source: TxnSource,
  opts?: { link?: string; ai?: boolean; anomalies?: Anomaly[] },
];

const month = (dataset: "c" | "p", yymm: string, rows: Row[]): TxnSeed[] =>
  rows.map(
    ([day, description, amount, direction, category, source, opts], index) => ({
      // Dataset prefix keeps ids globally unique across orgs — DELETE
      // /transactions/{id} filters by id alone, so a shared id would
      // remove the twin from the other org (PR #216 review).
      id: `txn-${dataset}-${yymm}-${String(index + 1).padStart(2, "0")}`,
      date: `20${yymm.slice(0, 2)}-${yymm.slice(2)}-${String(day).padStart(2, "0")}`,
      description,
      amount,
      direction,
      category,
      source,
      ...(opts ?? {}),
    }),
  );

/**
 * Cuesoft Ltd ledger, Jan–Jul 2026. Monthly totals (income / expenses):
 * Jan 5,160,000 / 5,540,000 · Feb 6,450,000 / 6,210,000 ·
 * Mar 7,310,000 / 6,840,000 · Apr 7,095,000 / 9,705,000 ·
 * May 8,600,000 / 10,940,000 · Jun 9,116,000 / 11,516,000 (LOCKED) ·
 * Jul MTD 8,435,200 / 3,614,800 (LOCKED).
 * Income sums are ×43/3-clean so the monthly VAT filings compute exactly.
 */
const cuesoftTxns: TxnSeed[] = [
  // ---- January 2026 — first full month on Expendit (GTB linked 12 Jan) --
  ...month("c", "2601", [
    [
      6,
      "Retainer — Kudaworks",
      3_200_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ],
    [
      19,
      "Invoice #1742 — Nairaflow",
      820_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      22,
      "Invoice #1747 — TradeDepot",
      545_000,
      "income",
      "cat-product",
      "csv",
      { ai: true },
    ],
    [
      27,
      "Workshop — CcHub onboarding",
      595_000,
      "income",
      "cat-workshops",
      "manual",
    ],
    [
      2,
      "Office rent — January",
      650_000,
      "expense",
      "cat-rent",
      "bank",
      { link: "link-gtb" },
    ],
    [
      6,
      "AWS hosting",
      372_000,
      "expense",
      "cat-cloud",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      15,
      "Software subscriptions",
      187_000,
      "expense",
      "cat-cloud",
      "csv",
      { ai: true },
    ],
    [
      7,
      "Airtel corporate internet",
      89_000,
      "expense",
      "cat-comms",
      "bank",
      { link: "link-access" },
    ],
    [13, "Fuel & transport", 132_000, "expense", "cat-transport", "receipt"],
    [
      9,
      "Dispatch — GIG Logistics",
      24_500,
      "expense",
      "cat-ops",
      "receipt",
      { ai: true },
    ],
    [
      16,
      "Ikeja Electric prepaid — office",
      41_000,
      "expense",
      "cat-ops",
      "receipt",
    ],
    [22, "Print — Printivo", 18_300, "expense", "cat-ops", "csv", { ai: true }],
    [24, "Team lunch — kickoff", 68_200, "expense", "cat-meals", "manual"],
    [
      20,
      "2 laptops — Slot Ikeja",
      908_000,
      "expense",
      "cat-equipment",
      "bank",
      { link: "link-gtb" },
    ],
    [
      28,
      "Payroll — January",
      3_050_000,
      "expense",
      "cat-payroll",
      "bank",
      { link: "link-zenith" },
    ],
  ]),
  // ---- February 2026 (Zenith linked 3 Feb) ------------------------------
  ...month("c", "2602", [
    [
      5,
      "Retainer — Kudaworks",
      3_200_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ],
    [
      17,
      "Invoice #1788 — Nairaflow",
      1_410_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      20,
      "Invoice #1794 — Mono dashboards",
      760_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-zenith", ai: true },
    ],
    [24, "Workshop — Semicolon", 430_000, "income", "cat-workshops", "manual"],
    [
      26,
      "Invoice #1801 — TradeDepot",
      650_000,
      "income",
      "cat-product",
      "csv",
      { ai: true },
    ],
    [
      2,
      "Office rent — February",
      650_000,
      "expense",
      "cat-rent",
      "bank",
      { link: "link-gtb" },
    ],
    [
      6,
      "AWS hosting",
      401_000,
      "expense",
      "cat-cloud",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      15,
      "Software subscriptions",
      201_000,
      "expense",
      "cat-cloud",
      "csv",
      { ai: true },
    ],
    [
      7,
      "Airtel corporate internet",
      91_500,
      "expense",
      "cat-comms",
      "bank",
      { link: "link-access" },
    ],
    [12, "Fuel & transport", 128_000, "expense", "cat-transport", "receipt"],
    [
      10,
      "Dispatch — GIG Logistics",
      31_200,
      "expense",
      "cat-ops",
      "receipt",
      { ai: true },
    ],
    [
      17,
      "Ikeja Electric prepaid — office",
      39_500,
      "expense",
      "cat-ops",
      "receipt",
    ],
    [
      21,
      "Stationery — Office Everything",
      16_800,
      "expense",
      "cat-ops",
      "csv",
      { ai: true },
    ],
    [25, "Team lunch", 74_000, "expense", "cat-meals", "manual"],
    [
      11,
      "Meta ads — lead gen",
      780_000,
      "expense",
      "cat-marketing",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      19,
      "Sponsorship — Lagos Startup Week",
      747_000,
      "expense",
      "cat-marketing",
      "bank",
      { link: "link-gtb" },
    ],
    [
      27,
      "Payroll — February",
      3_050_000,
      "expense",
      "cat-payroll",
      "bank",
      { link: "link-zenith" },
    ],
  ]),
  // ---- March 2026 --------------------------------------------------------
  ...month("c", "2603", [
    [
      5,
      "Retainer — Kudaworks",
      3_200_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ],
    [
      18,
      "Invoice #1820 — Nairaflow",
      1_720_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      24,
      "Invoice #1826 — Helios Energy",
      1_270_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-zenith" },
    ],
    [
      27,
      "Workshop — DataCamp Lagos",
      480_000,
      "income",
      "cat-workshops",
      "manual",
    ],
    [
      30,
      "Invoice #1834 — TradeDepot",
      640_000,
      "income",
      "cat-product",
      "csv",
      { ai: true },
    ],
    [
      2,
      "Office rent — March",
      650_000,
      "expense",
      "cat-rent",
      "bank",
      { link: "link-gtb" },
    ],
    [
      6,
      "AWS hosting",
      428_000,
      "expense",
      "cat-cloud",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      14,
      "Software subscriptions",
      217_000,
      "expense",
      "cat-cloud",
      "csv",
      { ai: true },
    ],
    [
      7,
      "Airtel corporate internet",
      94_000,
      "expense",
      "cat-comms",
      "bank",
      { link: "link-access" },
    ],
    [15, "Fuel & transport", 141_000, "expense", "cat-transport", "receipt"],
    [
      8,
      "Dispatch — GIG Logistics",
      27_400,
      "expense",
      "cat-ops",
      "receipt",
      { ai: true },
    ],
    [
      18,
      "Ikeja Electric prepaid — office",
      43_000,
      "expense",
      "cat-ops",
      "receipt",
    ],
    [21, "Office chair repair", 22_600, "expense", "cat-ops", "manual"],
    [26, "Team lunch", 81_000, "expense", "cat-meals", "manual"],
    [
      12,
      "Google ads — GA waitlist",
      640_000,
      "expense",
      "cat-marketing",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      19,
      "4 monitors — Slot Ikeja",
      896_000,
      "expense",
      "cat-equipment",
      "bank",
      { link: "link-gtb" },
    ],
    [
      27,
      "Payroll — March",
      3_600_000,
      "expense",
      "cat-payroll",
      "bank",
      { link: "link-zenith" },
    ],
  ]),
  // ---- April 2026 — staff-up month: payroll doubles (net −2,610,000,
  // the first of the three runway-burn months) ----------------------------
  ...month("c", "2604", [
    [
      7,
      "Retainer — Kudaworks",
      3_200_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ],
    [
      9,
      "Invoice #1899 — Nairaflow",
      640_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      14,
      "Invoice #1903 — Helios Energy",
      890_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-zenith" },
    ],
    [
      21,
      "Invoice #1911 — TradeDepot",
      545_000,
      "income",
      "cat-product",
      "csv",
      { ai: true },
    ],
    [
      24,
      "Workshop — CcHub design sprint",
      480_000,
      "income",
      "cat-workshops",
      "manual",
    ],
    [
      28,
      "Invoice #1918 — Mono dashboards",
      1_340_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      1,
      "Office rent — April",
      650_000,
      "expense",
      "cat-rent",
      "bank",
      { link: "link-gtb" },
    ],
    [
      6,
      "AWS hosting",
      489_000,
      "expense",
      "cat-cloud",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      15,
      "Software subscriptions",
      242_000,
      "expense",
      "cat-cloud",
      "csv",
      { ai: true },
    ],
    [
      7,
      "Airtel corporate internet",
      90_000,
      "expense",
      "cat-comms",
      "bank",
      { link: "link-access" },
    ],
    [12, "Fuel & transport", 146_000, "expense", "cat-transport", "receipt"],
    [
      9,
      "Dispatch — GIG Logistics",
      33_000,
      "expense",
      "cat-ops",
      "receipt",
      { ai: true },
    ],
    [
      17,
      "Ikeja Electric prepaid — office",
      45_500,
      "expense",
      "cat-ops",
      "receipt",
    ],
    [24, "Team lunch — new joiners", 88_500, "expense", "cat-meals", "manual"],
    [
      21,
      "GA pre-launch campaign",
      1_621_000,
      "expense",
      "cat-marketing",
      "bank",
      { link: "link-gtb" },
    ],
    [
      28,
      "Payroll — April",
      6_300_000,
      "expense",
      "cat-payroll",
      "bank",
      { link: "link-zenith" },
    ],
  ]),
  // ---- May 2026 (net −2,340,000) -----------------------------------------
  ...month("c", "2605", [
    [
      6,
      "Retainer — Kudaworks",
      3_200_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ],
    [
      12,
      "Invoice #1934 — Nairaflow",
      730_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      15,
      "Invoice #1938 — TradeDepot",
      545_000,
      "income",
      "cat-product",
      "csv",
      { ai: true },
    ],
    [
      19,
      "Invoice #1942 — Helios Energy",
      1_850_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-zenith" },
    ],
    [
      22,
      "Workshop — Semicolon cohort",
      440_000,
      "income",
      "cat-workshops",
      "manual",
    ],
    [
      27,
      "Invoice #1951 — PiggyVest data pilot",
      935_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      29,
      "Retainer top-up — Kudaworks scope change",
      900_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ],
    [
      1,
      "Office rent — May",
      650_000,
      "expense",
      "cat-rent",
      "bank",
      { link: "link-gtb" },
    ],
    [
      6,
      "AWS hosting",
      563_000,
      "expense",
      "cat-cloud",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      15,
      "Software subscriptions",
      297_000,
      "expense",
      "cat-cloud",
      "csv",
      { ai: true },
    ],
    [
      7,
      "Airtel corporate internet",
      95_000,
      "expense",
      "cat-comms",
      "bank",
      { link: "link-access" },
    ],
    [14, "Fuel & transport", 139_000, "expense", "cat-transport", "receipt"],
    [
      9,
      "Dispatch — GIG Logistics",
      29_800,
      "expense",
      "cat-ops",
      "receipt",
      { ai: true },
    ],
    [
      19,
      "Ikeja Electric prepaid — office",
      47_200,
      "expense",
      "cat-ops",
      "receipt",
    ],
    [
      23,
      "Courier — DHL documents",
      21_000,
      "expense",
      "cat-ops",
      "csv",
      { ai: true },
    ],
    [27, "Team lunch", 79_000, "expense", "cat-meals", "manual"],
    [
      12,
      "GA campaign — media buy",
      1_262_000,
      "expense",
      "cat-marketing",
      "bank",
      { link: "link-zenith" },
    ],
    [
      21,
      "Device fleet deposit — test phones",
      1_457_000,
      "expense",
      "cat-equipment",
      "bank",
      { link: "link-access" },
    ],
    [
      28,
      "Payroll — May",
      6_300_000,
      "expense",
      "cat-payroll",
      "bank",
      { link: "link-zenith" },
    ],
  ]),
  // ---- June 2026 — GA launch month (LOCKED: income 9,116,000 all vatable
  // → output VAT 636,000; cloud 1,224,067 → input VAT 85,400; net
  // −2,400,000). The five GTB rows below synced BEFORE the June GTB feed
  // outage — they are the staged job's 5 duplicates. ----------------------
  ...month("c", "2606", [
    [
      4,
      "Retainer — Kudaworks",
      3_200_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ], // dup twin
    [
      9,
      "Invoice #1969 — TradeDepot",
      610_000,
      "income",
      "cat-product",
      "csv",
      { ai: true },
    ],
    [
      12,
      "Invoice #1972 — Nairaflow",
      1_980_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-gtb", ai: true },
    ], // dup twin
    [
      17,
      "Workshop — DataCamp Lagos",
      520_000,
      "income",
      "cat-workshops",
      "manual",
    ],
    [
      20,
      "Invoice #1987 — Helios Energy",
      2_000_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-zenith" },
    ],
    [
      25,
      "Invoice #1994 — Mono dashboards",
      806_000,
      "income",
      "cat-product",
      "bank",
      { link: "link-zenith", ai: true },
    ],
    [
      1,
      "Office rent — June",
      650_000,
      "expense",
      "cat-rent",
      "bank",
      { link: "link-gtb" },
    ], // dup twin
    [
      9,
      "Cloud infrastructure — annual reserve",
      730_000,
      "expense",
      "cat-cloud",
      "bank",
      { link: "link-gtb", ai: true },
    ], // dup twin
    [
      18,
      "Software licences — design suite",
      494_067,
      "expense",
      "cat-cloud",
      "csv",
      { ai: true },
    ],
    [
      6,
      "Airtel corporate internet",
      96_500,
      "expense",
      "cat-comms",
      "bank",
      { link: "link-access" },
    ],
    [
      13,
      "Fuel & transport",
      143_000,
      "expense",
      "cat-transport",
      "bank",
      { link: "link-gtb" },
    ], // dup twin
    [
      10,
      "Dispatch — GIG Logistics",
      34_600,
      "expense",
      "cat-ops",
      "receipt",
      { ai: true },
    ],
    [
      16,
      "Ikeja Electric prepaid — office",
      49_400,
      "expense",
      "cat-ops",
      "receipt",
    ],
    [24, "Launch dinner — team", 86_000, "expense", "cat-meals", "manual"],
    [
      15,
      "Device fleet — balance",
      1_443_000,
      "expense",
      "cat-equipment",
      "bank",
      { link: "link-access" },
    ],
    [
      22,
      "GA launch — sprint",
      1_289_433,
      "expense",
      "cat-marketing",
      "bank",
      { link: "link-zenith" },
    ],
    [
      26,
      "Payroll — June",
      6_500_000,
      "expense",
      "cat-payroll",
      "bank",
      { link: "link-zenith" },
    ],
  ]),
  // ---- July 2026 MTD (LOCKED: income 8,435,200 / expenses 3,614,800;
  // monthly payroll runs on the 28th — the 18 Jul row is the contractor
  // advance, which is why July spend looks light mid-month) ----------------
  ...month("c", "2607", [
    [
      3,
      "Retainer — Kudaworks",
      3_200_000,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ],
    [
      8,
      "Invoice #2041 — Nairaflow",
      2_850_000,
      "income",
      "cat-product",
      "csv",
      {
        ai: true,
        anomalies: [
          {
            rule_id: "large_transaction",
            severity: "warn",
            note: "₦2,850,000 is 3.2× the trailing-90-day income median (₦900,000).",
          },
        ],
      },
    ],
    [
      10,
      "Invoice #2044 — TradeDepot",
      545_000,
      "income",
      "cat-product",
      "csv",
      { ai: true },
    ],
    [
      15,
      "Consulting — BlueRidge Capital",
      1_040_200,
      "income",
      "cat-consulting",
      "bank",
      { link: "link-gtb" },
    ],
    [
      18,
      "Workshop facilitation — DataCamp Lagos",
      800_000,
      "income",
      "cat-workshops",
      "manual",
    ],
    [
      1,
      "Office rent — July",
      650_000,
      "expense",
      "cat-rent",
      "bank",
      { link: "link-gtb" },
    ],
    [
      6,
      "AWS hosting",
      438_700,
      "expense",
      "cat-cloud",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      10,
      "Software subscriptions",
      164_300,
      "expense",
      "cat-cloud",
      "csv",
      { ai: true },
    ],
    [
      7,
      "Internet & comms — Q3 bundle",
      186_500,
      "expense",
      "cat-comms",
      "bank",
      {
        link: "link-access",
        anomalies: [
          {
            rule_id: "spending_spike",
            severity: "warn",
            note: "Internet & comms is ₦275,500 this month vs μ+2σ = ₦98,000 over the trailing 6 months — a quarterly bundle can trigger this; dismiss if expected.",
          },
        ],
      },
    ],
    [
      12,
      "Fuel & transport — diesel",
      56_000,
      "expense",
      "cat-transport",
      "receipt",
    ],
    [
      14,
      "DSTV Business — office",
      44_500,
      "expense",
      "cat-comms",
      "bank",
      { link: "link-gtb", ai: true },
    ],
    [
      17,
      "DSTV Business — office",
      44_500,
      "expense",
      "cat-comms",
      "bank",
      {
        link: "link-gtb",
        ai: true,
        anomalies: [
          {
            rule_id: "duplicate_charge",
            severity: "warn",
            note: "Same amount and merchant as the 14 Jul charge — possible double billing.",
          },
        ],
      },
    ],
    [
      14,
      "Equipment repair — office AC",
      95_300,
      "expense",
      "cat-ops",
      "receipt",
      {
        anomalies: [
          {
            rule_id: "abnormal_category",
            severity: "info",
            note: "₦95,300 is 2.9× the trailing per-transaction mean for Ops & logistics (₦33,000).",
          },
        ],
      },
    ],
    [16, "Team lunch — sprint close", 85_000, "expense", "cat-meals", "manual"],
    [
      18,
      "Payroll — July contractors (advance)",
      1_850_000,
      "expense",
      "cat-payroll",
      "bank",
      { link: "link-zenith" },
    ],
  ]),
];

/**
 * Personal org — the freelancer dataset, Aug 2025 – Jul 2026 (a full
 * trailing-12-month B1 window). Aug–Oct 2025 rows arrived as imported
 * statement history (source csv — the org itself was created 3 Nov 2025);
 * Nov onward is live use. 2026 YTD taxable gross is LOCKED at ₦5,400,000
 * (PIT-2026 estimate ₦762,000: 0% to 800k · 15% to 3m · 18% band) — the
 * 2025 backfill never enters the 2026 PIT basis. Anomaly notes compute
 * from these rows; all four AnomalyBadge types appear here too
 * (web-implementation.md §6).
 *
 * Monthly totals (income / expenses):
 * Aug-25 420,000 / 88,400 · Sep-25 380,000 / 80,300 ·
 * Oct-25 510,000 / 92,100 · Nov-25 300,000 / 83,400 ·
 * Dec-25 650,000 / 1,057,300 (H1-2026 rent prepaid 29 Dec) ·
 * Jan 380,000 / 48,200 · Feb 1,500,000 / 71,200 · Mar 450,000 / 244,300 ·
 * Apr 1,200,000 / 88,100 · May 170,000 / 98,900 · Jun 1,700,000 / 170,300 ·
 * Jul MTD 0 / 1,134,650 (H2 rent lands in July — the −174.2% "vs Jun"
 * net-cash-flow delta on B1 is real: −1,134,650 vs +1,529,700).
 */
const personalTxns: TxnSeed[] = [
  ...month("p", "2508", [
    [
      8,
      "Brand identity — Yaba fintech studio",
      420_000,
      "income",
      "cat-personal-clients",
      "csv",
      { ai: true },
    ],
    [
      2,
      "MTN data bundle",
      15_000,
      "expense",
      "cat-personal-tools",
      "csv",
      { ai: true },
    ],
    [
      15,
      "POS — Shoprite Lekki",
      51_400,
      "expense",
      "cat-personal-living",
      "csv",
      { ai: true },
    ],
    [
      22,
      "Fuel — Total Admiralty",
      22_000,
      "expense",
      "cat-personal-transport",
      "csv",
      { ai: true },
    ],
  ]),
  ...month("p", "2509", [
    [
      12,
      "Webflow build — Surulere logistics co",
      380_000,
      "income",
      "cat-personal-clients",
      "csv",
      { ai: true },
    ],
    [
      16,
      "POS — Shoprite Lekki",
      47_800,
      "expense",
      "cat-personal-living",
      "csv",
      { ai: true },
    ],
    [
      21,
      "Medplus pharmacy",
      14_200,
      "expense",
      "cat-personal-health",
      "csv",
      { ai: true },
    ],
    [
      27,
      "Bolt rides",
      18_300,
      "expense",
      "cat-personal-transport",
      "csv",
      { ai: true },
    ],
  ]),
  ...month("p", "2510", [
    [
      9,
      "Design sprint — Ikeja healthtech",
      510_000,
      "income",
      "cat-personal-clients",
      "csv",
      { ai: true },
    ],
    [
      2,
      "MTN data bundle",
      15_000,
      "expense",
      "cat-personal-tools",
      "csv",
      { ai: true },
    ],
    [
      17,
      "POS — Shoprite Lekki",
      55_600,
      "expense",
      "cat-personal-living",
      "csv",
      { ai: true },
    ],
    [
      24,
      "Fuel — Total Admiralty",
      21_500,
      "expense",
      "cat-personal-transport",
      "csv",
      { ai: true },
    ],
  ]),
  // Nov 2025 — the org's first live month (created 3 Nov 2025).
  ...month("p", "2511", [
    [
      14,
      "Logo + deck refresh — Ajah retail chain",
      300_000,
      "income",
      "cat-personal-clients",
      "manual",
    ],
    [
      11,
      "POS — Shoprite Lekki",
      49_200,
      "expense",
      "cat-personal-living",
      "csv",
      { ai: true },
    ],
    [
      19,
      "Medplus pharmacy",
      16_800,
      "expense",
      "cat-personal-health",
      "receipt",
      { ai: true },
    ],
    [
      25,
      "Bolt rides",
      17_400,
      "expense",
      "cat-personal-transport",
      "receipt",
      { ai: true },
    ],
  ]),
  ...month("p", "2512", [
    [
      18,
      "Year-end campaign — PiggyVest referral",
      650_000,
      "income",
      "cat-personal-clients",
      "csv",
      { ai: true },
    ],
    [
      20,
      "POS — Shoprite Lekki",
      68_900,
      "expense",
      "cat-personal-living",
      "csv",
      { ai: true },
    ],
    [
      22,
      "Fuel — Total Admiralty",
      26_000,
      "expense",
      "cat-personal-transport",
      "receipt",
      { ai: true },
    ],
    [
      27,
      "Medplus pharmacy",
      12_400,
      "expense",
      "cat-personal-health",
      "receipt",
      { ai: true },
    ],
    // Semiannual rent cycle: H1-2026 prepaid end-December, H2 paid 5 Jul
    // (the existing July row) — December dips negative, mirroring July.
    [
      29,
      "Rent — Lekki apartment (H1)",
      950_000,
      "expense",
      "cat-personal-living",
      "manual",
    ],
  ]),
  ...month("p", "2601", [
    [
      20,
      "Pitch deck — Kudaworks referral",
      380_000,
      "income",
      "cat-personal-clients",
      "csv",
      { ai: true },
    ],
    [
      18,
      "POS — Shoprite Lekki",
      48_200,
      "expense",
      "cat-personal-living",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
  ]),
  ...month("p", "2602", [
    [
      10,
      "Dividend — Cuesoft Ltd",
      1_500_000,
      "income",
      "cat-personal-income",
      "manual",
    ],
    [
      15,
      "POS — Shoprite Lekki",
      52_700,
      "expense",
      "cat-personal-living",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      20,
      "Medplus pharmacy",
      18_500,
      "expense",
      "cat-personal-health",
      "receipt",
      { ai: true },
    ],
  ]),
  ...month("p", "2603", [
    [
      11,
      "Landing page — Lekki Gardens listing",
      450_000,
      "income",
      "cat-personal-clients",
      "manual",
    ],
    [
      3,
      "Figma professional — annual",
      183_000,
      "expense",
      "cat-personal-tools",
      "csv",
      { ai: true },
    ],
    [
      16,
      "POS — Shoprite Lekki",
      61_300,
      "expense",
      "cat-personal-living",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
  ]),
  ...month("p", "2604", [
    [
      15,
      "Advisory fee — Delta Ventures",
      1_200_000,
      "income",
      "cat-personal-income",
      "manual",
      {
        anomalies: [
          {
            rule_id: "large_transaction",
            severity: "warn",
            note: "₦1,200,000 is 2.7× your trailing-90-day median credit (₦450,000).",
          },
        ],
      },
    ],
    [
      12,
      "Bolt rides",
      19_800,
      "expense",
      "cat-personal-transport",
      "receipt",
      { ai: true },
    ],
    [
      19,
      "POS — Shoprite Lekki",
      44_800,
      "expense",
      "cat-personal-living",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      25,
      "Medplus pharmacy",
      23_500,
      "expense",
      "cat-personal-health",
      "receipt",
      { ai: true },
    ],
  ]),
  ...month("p", "2605", [
    [
      8,
      "Brand audit — PiggyVest referral",
      170_000,
      "income",
      "cat-personal-clients",
      "csv",
      { ai: true },
    ],
    [
      2,
      "MTN data bundle",
      16_500,
      "expense",
      "cat-personal-tools",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      17,
      "POS — Shoprite Lekki",
      57_900,
      "expense",
      "cat-personal-living",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      20,
      "Fuel — Total Admiralty",
      24_500,
      "expense",
      "cat-personal-transport",
      "receipt",
      { ai: true },
    ],
  ]),
  ...month("p", "2606", [
    [
      30,
      "Dividend — Cuesoft Ltd",
      1_700_000,
      "income",
      "cat-personal-income",
      "manual",
    ],
    [
      2,
      "MTN data bundle",
      16_500,
      "expense",
      "cat-personal-tools",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      14,
      "POS — Shoprite Lekki",
      63_400,
      "expense",
      "cat-personal-living",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      21,
      "Bolt rides",
      22_400,
      "expense",
      "cat-personal-transport",
      "receipt",
      { ai: true },
    ],
    [
      28,
      "Lens replacement — Eyemart",
      68_000,
      "expense",
      "cat-personal-health",
      "receipt",
      {
        anomalies: [
          {
            rule_id: "abnormal_category",
            severity: "info",
            note: "₦68,000 is 3.2× the trailing mean for Health (₦21,000).",
          },
        ],
      },
    ],
  ]),
  ...month("p", "2607", [
    [
      5,
      "Rent — Lekki apartment (H2)",
      950_000,
      "expense",
      "cat-personal-living",
      "manual",
    ],
    [
      2,
      "MTN data bundle",
      16_500,
      "expense",
      "cat-personal-tools",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      9,
      "Fuel — Total Admiralty",
      28_000,
      "expense",
      "cat-personal-transport",
      "receipt",
      { ai: true },
    ],
    [
      11,
      "Generator diesel — home office",
      87_500,
      "expense",
      "cat-personal-transport",
      "receipt",
      {
        anomalies: [
          {
            rule_id: "spending_spike",
            severity: "warn",
            note: "Transport & fuel is ₦115,500 this month vs μ+2σ = ₦30,000 over the trailing months — generator diesel drove the jump.",
          },
        ],
      },
    ],
    [
      12,
      "POS — Shoprite Lekki",
      38_650,
      "expense",
      "cat-personal-living",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      15,
      "Netflix",
      7_000,
      "expense",
      "cat-personal-tools",
      "bank",
      { link: "link-personal-gtb", ai: true },
    ],
    [
      15,
      "Netflix",
      7_000,
      "expense",
      "cat-personal-tools",
      "bank",
      {
        link: "link-personal-gtb",
        ai: true,
        anomalies: [
          {
            rule_id: "duplicate_charge",
            severity: "warn",
            note: "Charged twice on 15 Jul — same amount and merchant.",
          },
        ],
      },
    ],
  ]),
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

/**
 * Bank links — all five BANK_LINK states (data-model.md §6.2). The GTB
 * feed had a June outage (why the June statement was uploaded); Access
 * expired 12 Jul (re-auth banner); Kuda was initiated minutes ago.
 */
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
    imported_txn_count: 58,
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
    imported_txn_count: 31,
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
    imported_txn_count: 12,
    created_at: "2026-03-19T08:00:00.000Z",
  },
  {
    id: "link-uba",
    org_id: ORG_CUESOFT,
    provider: "mono",
    institution: "UBA",
    masked_account: "···5521",
    status: "paused",
    last_synced_at: "2026-04-30T05:00:00.000Z",
    auto_confirm: false,
    imported_txn_count: 6,
    created_at: "2026-02-20T08:00:00.000Z",
  },
  {
    id: "link-first",
    org_id: ORG_CUESOFT,
    provider: "mono",
    institution: "First Bank",
    masked_account: "···8843",
    status: "degraded",
    last_synced_at: "2026-07-18T03:12:00.000Z",
    auto_confirm: false,
    imported_txn_count: 4,
    created_at: "2026-05-11T08:00:00.000Z",
  },
  {
    id: "link-kuda",
    org_id: ORG_CUESOFT,
    provider: "mono",
    institution: "Kuda",
    masked_account: "···1017",
    status: "pending",
    last_synced_at: null,
    auto_confirm: false,
    imported_txn_count: 0,
    created_at: "2026-07-20T09:58:00.000Z",
  },
  {
    id: "link-personal-gtb",
    org_id: ORG_PERSONAL,
    provider: "mono",
    institution: "GTBank",
    masked_account: "···2210",
    status: "active",
    last_synced_at: "2026-07-20T05:10:00.000Z",
    auto_confirm: false,
    imported_txn_count: 14,
    created_at: "2026-02-14T08:00:00.000Z",
  },
];

/**
 * The 214/209/5 staged review job (MI-2 "214 transactions found").
 * The 5 duplicates mirror the five June GTB ledger rows that synced
 * before the outage — date, description and amount match exactly, so
 * the job's duplicate-charge note is literally true.
 */
const GTB_JUNE_TWINS: Array<
  Pick<
    StagedTransaction,
    "description" | "amount" | "direction" | "category_id" | "txn_date"
  >
> = [
  {
    description: "Office rent — June",
    amount: 650_000,
    direction: "expense",
    category_id: "cat-rent",
    txn_date: "2026-06-01",
  },
  {
    description: "Retainer — Kudaworks",
    amount: 3_200_000,
    direction: "income",
    category_id: "cat-consulting",
    txn_date: "2026-06-04",
  },
  {
    description: "Cloud infrastructure — annual reserve",
    amount: 730_000,
    direction: "expense",
    category_id: "cat-cloud",
    txn_date: "2026-06-09",
  },
  {
    description: "Invoice #1972 — Nairaflow",
    amount: 1_980_000,
    direction: "income",
    category_id: "cat-product",
    txn_date: "2026-06-12",
  },
  {
    description: "Fuel & transport",
    amount: 143_000,
    direction: "expense",
    category_id: "cat-transport",
    txn_date: "2026-06-13",
  },
];

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
  let twinIndex = 0;
  for (let i = 0; i < 214; i += 1) {
    const isIncome = rand() < 0.12;
    const day = 1 + Math.floor(rand() * 30);
    const merchant = merchants[Math.floor(rand() * merchants.length)];
    const amount = isIncome
      ? Math.round((150_000 + rand() * 1_450_000) / 100) * 100
      : Math.round((1_500 + rand() * 240_000) / 100) * 100;
    // Exactly 5 duplicates at rows 30/74/118/162/206 (MI-3 "discard 5"),
    // each mirroring a June GTB ledger row.
    const isDuplicate = i % 44 === 30;
    const base = {
      id: `staged-gtb-${(i + 1).toString().padStart(3, "0")}`,
      job_id: STAGED_JOB_ID,
      ai_categorized: rand() < 0.85,
      is_duplicate: isDuplicate,
      include_duplicate: false,
    };
    if (isDuplicate) {
      rows.push({
        ...base,
        ai_categorized: true,
        ...GTB_JUNE_TWINS[twinIndex],
      });
      twinIndex += 1;
    } else {
      rows.push({
        ...base,
        description: isIncome ? "Transfer in — client payment" : merchant,
        amount,
        direction: isIncome ? "income" : "expense",
        category_id: isIncome
          ? "cat-consulting"
          : expenseCats[Math.floor(rand() * expenseCats.length)],
        txn_date: `2026-06-${day.toString().padStart(2, "0")}`,
      });
    }
  }
  return rows;
};

/** Statement summary computed from the staged rows — never hand-summed. */
const stagedSummary = (rows: StagedTransaction[]) => {
  const summary = {
    total_income: 0,
    total_expense: 0,
    net: 0,
    by_category: {} as Record<string, number>,
  };
  for (const row of rows) {
    if (row.direction === "income") summary.total_income += row.amount;
    else summary.total_expense += row.amount;
    summary.by_category[row.category_id] =
      (summary.by_category[row.category_id] ?? 0) + row.amount;
  }
  summary.net = summary.total_income - summary.total_expense;
  return summary;
};

const stagedRows = buildStagedRows();

/**
 * Import history — every ImportJobRow status (processing / completed /
 * completed-empty / completed-bank / failed), telling one arc:
 * GTB's June feed outage → tried the PDF export (0 rows, image-only) →
 * uploaded the CSV (staged, 214/5); Access expired 12 Jul → its June PDF
 * was password-protected (failed) → the July retry is processing now.
 */
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
    summary: stagedSummary(stagedRows),
    ai_summary:
      "214 transactions found in the June GTBank statement. Retail POS and transfers dominate; 5 rows match ledger entries that synced before the June feed outage.",
    anomalies: [
      {
        rule_id: "duplicate_charge",
        severity: "warn",
        note: "5 staged rows match ledger entries on date, exact amount and description — synced before the June GTBank outage.",
      },
    ],
    warnings: [],
    error_code: null,
    confirmed: false,
    created_at: "2026-07-20T09:12:00.000Z",
    completed_at: "2026-07-20T09:13:20.000Z",
  },
  {
    id: "job-processing-access-jul",
    org_id: ORG_CUESOFT,
    source: "upload",
    status: "processing",
    file_name: "access-statement-july.pdf",
    file_type: "pdf",
    total_parsed: 0,
    duplicates_found: 0,
    imported: 0,
    summary: null,
    ai_summary: null,
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: false,
    created_at: "2026-07-20T09:58:40.000Z",
    completed_at: null,
  },
  {
    id: "job-empty-gtb-pdf",
    org_id: ORG_CUESOFT,
    source: "upload",
    status: "completed", // completed-empty (no_transactions_found UX)
    file_name: "gtbank-statement-june-2026.pdf",
    file_type: "pdf",
    total_parsed: 0,
    duplicates_found: 0,
    imported: 0,
    summary: null,
    ai_summary:
      "No transaction rows found — this PDF looks like a scanned image with no text layer. The CSV export from GTBank internet banking parses cleanly.",
    anomalies: [],
    warnings: ["image-only PDF — no extractable text layer"],
    error_code: null,
    confirmed: false,
    created_at: "2026-07-19T18:44:00.000Z",
    completed_at: "2026-07-19T18:44:35.000Z",
  },
  {
    id: "job-sync-zenith-jul19",
    org_id: ORG_CUESOFT,
    source: "bank_sync",
    status: "completed",
    file_name: null,
    file_type: null,
    total_parsed: 1,
    duplicates_found: 0,
    imported: 1,
    summary: {
      total_income: 0,
      total_expense: 1_850_000,
      net: -1_850_000,
      by_category: { "cat-payroll": 1_850_000 },
    },
    ai_summary: null,
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: true,
    created_at: "2026-07-19T04:41:00.000Z",
    completed_at: "2026-07-19T04:41:20.000Z",
  },
  {
    id: "job-sync-gtb-jul18",
    org_id: ORG_CUESOFT,
    source: "bank_sync",
    status: "completed",
    file_name: null,
    file_type: null,
    total_parsed: 2,
    duplicates_found: 0,
    imported: 2,
    summary: {
      total_income: 1_040_200,
      total_expense: 44_500,
      net: 995_700,
      by_category: { "cat-consulting": 1_040_200, "cat-comms": 44_500 },
    },
    ai_summary: null,
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: true,
    created_at: "2026-07-18T04:40:00.000Z",
    completed_at: "2026-07-18T04:40:30.000Z",
  },
  {
    id: "job-failed-access-jun",
    org_id: ORG_CUESOFT,
    source: "upload",
    status: "failed",
    file_name: "access-statement-june.pdf",
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
    created_at: "2026-07-14T11:02:00.000Z",
    completed_at: "2026-07-14T11:02:40.000Z",
  },
  {
    id: "job-sync-access-jul08",
    org_id: ORG_CUESOFT,
    source: "bank_sync",
    status: "completed",
    file_name: null,
    file_type: null,
    total_parsed: 1,
    duplicates_found: 0,
    imported: 1,
    summary: {
      total_income: 0,
      total_expense: 186_500,
      net: -186_500,
      by_category: { "cat-comms": 186_500 },
    },
    ai_summary: null,
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: true,
    created_at: "2026-07-08T04:58:00.000Z",
    completed_at: "2026-07-08T04:58:25.000Z",
  },
  {
    id: "job-upload-tradedepot-q2",
    org_id: ORG_CUESOFT,
    source: "upload",
    status: "completed",
    file_name: "tradedepot-invoices-q2.csv",
    file_type: "csv",
    total_parsed: 3,
    duplicates_found: 0,
    imported: 3,
    summary: {
      total_income: 1_700_000,
      total_expense: 0,
      net: 1_700_000,
      by_category: { "cat-product": 1_700_000 },
    },
    ai_summary:
      "3 TradeDepot invoices reconciled for Q2 — April, May and June settlements.",
    anomalies: [],
    warnings: [],
    error_code: null,
    confirmed: true,
    created_at: "2026-07-01T10:15:00.000Z",
    completed_at: "2026-07-01T10:15:40.000Z",
  },
];

/**
 * FY2025 statements — identity-consistent (46.5m = 19.75m + 26.75m).
 * LOCKED: unit tests + the CIT filing compute from these rows.
 */
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

/**
 * FY2025 cash flow — cfo 13.4m + cfi −6.1m + cff −1.9m = +5.4m, exactly
 * the cash movement 12,240,000 (FY2024 BS) → 17,640,000 (FY2025 BS).
 * Signed per the line-items.md §4 cash-flow exception; capex sits inside
 * cfi. Two confirmed cash-flow periods stay <3, so runway keeps its
 * ledger-burn source (line-items.md §5).
 */
const CF_FY2025: Array<[CanonicalKey, number, boolean]> = [
  ["cfo", 13_400_000, false],
  ["cfi", -6_100_000, false],
  ["capex", -5_200_000, false],
  ["cff", -1_900_000, false],
  ["net_change_in_cash", 5_400_000, true],
];

/**
 * FY2024 statements — the turnaround story's "before": strained balance
 * sheet (current ratio 1.27 warning · debt ratio 0.68 warning) and a
 * small net loss with interest coverage 1.3 (critical). Identity:
 * 46,000,000 = 31,450,000 + 14,550,000 ✓. RE continuity into FY2025:
 * 4,550,000 + 12,200,000 = 16,750,000 ✓. No FY2024 cash-flow statement —
 * the CFO-based metrics render their honest "n/a — missing cash_flow".
 */
const BS_FY2024: Array<[CanonicalKey, number, boolean]> = [
  ["cash_and_equivalents", 12_240_000, false],
  ["receivables", 9_800_000, false],
  ["inventory", 3_400_000, false],
  ["current_assets_other", 560_000, false],
  ["current_assets", 26_000_000, true],
  ["ppe", 15_100_000, false],
  ["intangibles", 3_900_000, false],
  ["noncurrent_assets_other", 1_000_000, false],
  ["total_assets", 46_000_000, true],
  ["payables", 9_400_000, false],
  ["short_term_debt", 8_100_000, false],
  ["current_liabilities_other", 2_900_000, false],
  ["current_liabilities", 20_400_000, true],
  ["long_term_debt", 9_700_000, false],
  ["noncurrent_liabilities_other", 1_350_000, false],
  ["total_liabilities", 31_450_000, true],
  ["share_capital", 10_000_000, false],
  ["retained_earnings", 4_550_000, false],
  ["equity", 14_550_000, true],
];

const IS_FY2024: Array<[CanonicalKey, number, boolean]> = [
  ["revenue", 96_800_000, false],
  ["cogs", 52_300_000, false],
  ["gross_profit", 44_500_000, true],
  ["opex", 38_600_000, false],
  ["depreciation_amortization", 3_750_000, false],
  ["operating_profit", 2_150_000, true],
  ["interest_expense", 1_650_000, false],
  ["interest_income", 150_000, false],
  ["tax_expense", 780_000, false],
  // A small loss year: 2,150,000 + 150,000 − 1,650,000 − 780,000 —
  // net-income growth into FY2025 renders the documented "sign change"
  // suppression (line-items.md §5 growth rules).
  ["net_income", -130_000, true],
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
  cfo: "Net cash from operating activities",
  cfi: "Net cash used in investing activities",
  capex: "Purchase of property, plant and equipment",
  cff: "Net cash used in financing activities",
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
  // FY2024 pair — uploaded during onboarding (Nov 2025).
  {
    id: "stmt-bs-fy2024",
    org_id: ORG_CUESOFT,
    kind: "balance_sheet",
    period: "FY2024",
    currency: "NGN",
    source_file_type: "xlsx",
    mapping_status: "confirmed",
    superseded_by: null,
    mapping_warnings: [],
    created_at: "2025-11-20T10:10:00.000Z",
    confirmed_at: "2025-11-20T10:45:00.000Z",
  },
  {
    id: "stmt-is-fy2024",
    org_id: ORG_CUESOFT,
    kind: "income_statement",
    period: "FY2024",
    currency: "NGN",
    source_file_type: "xlsx",
    mapping_status: "confirmed",
    superseded_by: null,
    mapping_warnings: [],
    created_at: "2025-11-20T10:12:00.000Z",
    confirmed_at: "2025-11-20T10:48:00.000Z",
  },
  // FY2025 set — uploaded after year-end close (Mar 2026).
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
    id: "stmt-cf-fy2025",
    org_id: ORG_CUESOFT,
    kind: "cash_flow",
    period: "FY2025",
    currency: "NGN",
    source_file_type: "xlsx",
    mapping_status: "confirmed",
    superseded_by: null,
    mapping_warnings: [],
    created_at: "2026-03-14T09:34:00.000Z",
    confirmed_at: "2026-03-14T10:12:00.000Z",
  },
  // Mid-review Q2 balance sheet (the mapping-review demo).
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
    tin: null, // filing generate → 422 tax_identity_incomplete (the demo)
    state_of_residence: "NG-LA", // PIT → LIRS (tax-engine.md §5.5)
    rc_number: null,
    nin: null,
    category_treatments: {
      "cat-personal-income": {
        tax_treatment: "taxable_income",
        vat_treatment: "exempt",
        vat_basis: "inclusive",
      },
      "cat-personal-clients": {
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
    // Complete — the CIT/VAT filing history below could not exist
    // otherwise (generate gates on tax identity).
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

/** VAT filing sub-fields — output/input/net computed from the ledger. */
const vatFields = (output: number, input: number) => [
  {
    key: "output_vat",
    label: "Output VAT",
    value: output,
    formula: "Σ vatable income × 7.5/107.5 (inclusive)",
    inputs: [],
    notes: ["ledger amounts are VAT-inclusive by default"],
  },
  {
    key: "input_vat",
    label: "Recoverable input VAT",
    value: input,
    formula: "Σ vatable expenses × 7.5/107.5 (inclusive)",
    inputs: [],
    notes: ["fully recoverable — all supplies vatable"],
  },
  {
    key: "net_vat",
    label: "Net VAT position",
    value: output - input,
    formula: "output − recoverable input",
    inputs: [],
    notes: [],
  },
];

/** One VAT filing per completed month — rising with revenue. */
const vatFiling = (
  monthToken: string,
  output: number,
  input: number,
  dueDate: string,
  filedAt: string,
): TaxFiling => ({
  id: `filing-vat-${monthToken}`,
  org_id: ORG_CUESOFT,
  kind: "vat",
  period: monthToken,
  status: "submitted",
  amount_due: output - input,
  due_date: dueDate,
  computed_fields: vatFields(output, input),
  authority: FIRS,
  artifact_key: `filings/vat-${monthToken}-cuesoft.zip`,
  filed_at: filedAt,
  created_at: filedAt,
});

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
  // Monthly VAT history — each computes exactly from that month's ledger
  // (income all vatable; input from Cloud & software): net 321,000 →
  // 540,000, tracking revenue growth toward June's 550,600 estimate.
  vatFiling(
    "2026-05",
    600_000,
    60_000,
    "2026-06-21",
    "2026-06-19T10:40:00.000Z",
  ),
  vatFiling(
    "2026-04",
    495_000,
    51_000,
    "2026-05-21",
    "2026-05-19T09:35:00.000Z",
  ),
  vatFiling(
    "2026-03",
    510_000,
    45_000,
    "2026-04-21",
    "2026-04-17T11:05:00.000Z",
  ),
  vatFiling(
    "2026-02",
    450_000,
    42_000,
    "2026-03-21",
    "2026-03-18T10:22:00.000Z",
  ),
  vatFiling(
    "2026-01",
    360_000,
    39_000,
    "2026-02-21",
    "2026-02-18T09:50:00.000Z",
  ),
];

/**
 * Report artifacts — every ReportArtifactRow state: generating (started
 * minutes ago) / ready / NEW ≤24h / expired (past its 30-day TTL; the
 * GET maps it on read).
 */
const artifacts: ReportArtifact[] = [
  {
    id: "artifact-cashmove-jun",
    org_id: ORG_CUESOFT,
    kind: "cash_movement",
    format: "pdf",
    period: "2026-06",
    params: {},
    status: "generating",
    signed_url: null,
    created_at: "2026-07-20T09:41:00.000Z",
    expires_at: "2026-08-19T09:41:00.000Z",
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
  {
    id: "artifact-monthly-mar",
    org_id: ORG_CUESOFT,
    kind: "monthly_summary",
    format: "pdf",
    period: "2026-03",
    params: {},
    status: "ready", // expires_at < today → served as expired
    signed_url: "/api/mock/reports/artifact-monthly-mar/download",
    created_at: "2026-04-02T09:20:00.000Z",
    expires_at: "2026-05-02T09:20:00.000Z",
  },
];

const consents: ConsentRecord[] = [
  {
    id: "consent-tos",
    user_id: USER_IBUKUN,
    document: "tos",
    version: "1.0",
    accepted_at: "2025-11-03T09:00:00.000Z",
  },
  {
    id: "consent-privacy",
    user_id: USER_IBUKUN,
    document: "privacy",
    version: "1.0",
    accepted_at: "2025-11-03T09:00:00.000Z",
  },
  {
    id: "consent-ai",
    user_id: USER_IBUKUN,
    document: "ai_processing",
    version: "1.0",
    accepted_at: "2025-11-03T09:00:10.000Z",
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
  stagedTxns: structuredClone(stagedRows),
  bankLinks: structuredClone(bankLinks),
  statements: structuredClone(statements),
  lineItems: [
    ...buildLineItems("stmt-bs-fy2024", BS_FY2024),
    ...buildLineItems("stmt-is-fy2024", IS_FY2024),
    ...buildLineItems("stmt-bs-fy2025", BS_FY2025),
    ...buildLineItems("stmt-is-fy2025", IS_FY2025),
    ...buildLineItems("stmt-cf-fy2025", CF_FY2025),
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
  // Seeded bank-sync jobs attribute to their links — the auto-confirm
  // trust gate counts confirmed clean syncs per link through this map.
  jobLinks: {
    "job-sync-zenith-jul19": "link-zenith",
    "job-sync-gtb-jul18": "link-gtb",
    "job-sync-access-jul08": "link-access",
  },
  processingSince: {},
  seq: 1000,
});
