/**
 * A5 demo datasets — the design.md §8.3 synthetic demo pool ×3
 * (freelancer / SME / company), the same narrative the Figma Home frame
 * (193:14) and the mock-server seed render. The freelancer dataset is the
 * Figma A5 strip verbatim; the company dataset mirrors the seed.ts Cuesoft
 * Ltd July-2026 narrative exactly (income ₦8,435,200 / expenses ₦3,614,800
 * / runway 7.2 months); the SME dataset is crafted in the same style.
 *
 * Static module (no network): the public home renders in both TEST_MODE
 * and production, so the demo strip cannot depend on the authenticated
 * mock endpoints. Every dataset is internally consistent (unit-tested):
 * net = income − expenses and the donut slices sum to the expenses stat.
 *
 * Category colors are user data, not design tokens (same rule as seed.ts).
 */

import type { TxnDirection, TxnSource } from "@/models";

export type DemoPersona = "freelancer" | "sme" | "company";

export const DEMO_PERSONAS: DemoPersona[] = ["freelancer", "sme", "company"];

export interface DemoCategory {
  id: string;
  name: string;
  color: string;
}

export interface DemoTxn {
  id: string;
  /** ISO date. */
  date: string;
  description: string;
  amount: number;
  direction: TxnDirection;
  categoryId: string;
  source: TxnSource;
  /** AI-suggested, not yet human-confirmed (CategoryChip ✨). */
  ai?: boolean;
}

export interface DemoStat {
  label: string;
  value: number;
  /** Delta vs previous month, as a fraction (MI-7 delta chip). */
  delta: number;
  sparkline: number[];
}

export interface DemoDonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface DemoDataset {
  persona: DemoPersona;
  label: string;
  currency: "NGN";
  deltaCaption: string;
  stats: { net: DemoStat; income: DemoStat; expenses: DemoStat };
  /** 12-month cash-flow series (single accent line, Figma A5). */
  cashflow: { points: number[]; xLabels: string[] };
  donut: { slices: DemoDonutSlice[]; centerTotal: string };
  categories: DemoCategory[];
  txns: DemoTxn[];
}

/** Six x ticks over the trailing 12 months (Figma: Aug…Jun). */
const X_LABELS = ["Aug", "Oct", "Dec", "Feb", "Apr", "Jun"];

const FREELANCER: DemoDataset = {
  persona: "freelancer",
  label: "Freelancer",
  currency: "NGN",
  deltaCaption: "vs Jun",
  stats: {
    net: {
      label: "Net cash flow",
      value: 968_000,
      delta: 0.124,
      sparkline: [640, 690, 655, 720, 760, 745, 810, 968],
    },
    income: {
      label: "Income",
      value: 1_480_000,
      delta: 0.081,
      sparkline: [1_120, 1_180, 1_150, 1_240, 1_300, 1_280, 1_369, 1_480],
    },
    expenses: {
      label: "Expenses",
      value: 512_000,
      delta: 0.034,
      sparkline: [430, 445, 460, 452, 470, 488, 495, 512],
    },
  },
  cashflow: {
    points: [
      520_000, 610_000, 580_000, 700_000, 760_000, 720_000, 830_000, 905_000,
      860_000, 940_000, 900_000, 968_000,
    ],
    xLabels: X_LABELS,
  },
  donut: {
    slices: [
      { id: "equipment", label: "Equipment", value: 204_800, color: "#F46A1F" },
      { id: "utilities", label: "Utilities", value: 128_000, color: "#2456D6" },
      { id: "transport", label: "Transport", value: 102_400, color: "#B26A00" },
      { id: "other", label: "Other", value: 76_800, color: "#6E6E76" },
    ],
    centerTotal: "₦512K",
  },
  categories: [
    { id: "equipment", name: "Equipment", color: "#F46A1F" },
    { id: "utilities", name: "Utilities", color: "#2456D6" },
    { id: "transport", name: "Transport", color: "#B26A00" },
    { id: "other", name: "Other", color: "#6E6E76" },
    { id: "sales", name: "Sales", color: "#1B7F4B" },
  ],
  txns: [
    {
      id: "fl-1",
      date: "2026-07-16",
      description: "MTN — data bundle top-up",
      amount: 24_500,
      direction: "expense",
      categoryId: "utilities",
      source: "bank",
      ai: true,
    },
    {
      id: "fl-2",
      date: "2026-07-15",
      description: "Paystack payout — client invoice #041",
      amount: 420_000,
      direction: "income",
      categoryId: "sales",
      source: "csv",
    },
    {
      id: "fl-3",
      date: "2026-07-15",
      description: "Jumia — laptop stand",
      amount: 38_500,
      direction: "expense",
      categoryId: "equipment",
      source: "receipt",
      ai: true,
    },
    {
      id: "fl-4",
      date: "2026-07-14",
      description: "Ikeja Electric — studio meter",
      amount: 18_200,
      direction: "expense",
      categoryId: "utilities",
      source: "bank",
    },
    {
      id: "fl-5",
      date: "2026-07-12",
      description: "Bolt — client meetings",
      amount: 12_300,
      direction: "expense",
      categoryId: "transport",
      source: "manual",
      ai: true,
    },
  ],
};

const SME: DemoDataset = {
  persona: "sme",
  label: "SME",
  currency: "NGN",
  deltaCaption: "vs Jun",
  stats: {
    net: {
      label: "Net cash flow",
      value: 1_770_000,
      delta: 0.096,
      sparkline: [1_310, 1_420, 1_380, 1_490, 1_560, 1_540, 1_615, 1_770],
    },
    income: {
      label: "Income",
      value: 4_150_000,
      delta: 0.052,
      sparkline: [3_420, 3_510, 3_480, 3_640, 3_760, 3_820, 3_945, 4_150],
    },
    expenses: {
      label: "Expenses",
      value: 2_380_000,
      delta: 0.021,
      sparkline: [2_140, 2_180, 2_210, 2_190, 2_260, 2_300, 2_331, 2_380],
    },
  },
  cashflow: {
    points: [
      1_050_000, 1_240_000, 1_180_000, 1_360_000, 1_450_000, 1_400_000,
      1_520_000, 1_610_000, 1_560_000, 1_680_000, 1_640_000, 1_770_000,
    ],
    xLabels: X_LABELS,
  },
  donut: {
    slices: [
      { id: "payroll", label: "Payroll", value: 1_047_200, color: "#F46A1F" },
      { id: "rent", label: "Rent", value: 595_000, color: "#2456D6" },
      {
        id: "cloud",
        label: "Cloud & software",
        value: 452_200,
        color: "#B26A00",
      },
      { id: "other", label: "Other", value: 285_600, color: "#6E6E76" },
    ],
    centerTotal: "₦2.38M",
  },
  categories: [
    { id: "payroll", name: "Payroll", color: "#F46A1F" },
    { id: "rent", name: "Rent", color: "#2456D6" },
    { id: "cloud", name: "Cloud & software", color: "#B26A00" },
    { id: "other", name: "Other", color: "#6E6E76" },
    { id: "client-income", name: "Client income", color: "#1B7F4B" },
  ],
  txns: [
    {
      id: "sme-1",
      date: "2026-07-17",
      description: "Retainer — Halcyon Studios",
      amount: 1_500_000,
      direction: "income",
      categoryId: "client-income",
      source: "bank",
    },
    {
      id: "sme-2",
      date: "2026-07-15",
      description: "Payroll — July, 6 staff",
      amount: 1_047_200,
      direction: "expense",
      categoryId: "payroll",
      source: "bank",
    },
    {
      id: "sme-3",
      date: "2026-07-11",
      description: "Figma — annual seats",
      amount: 214_000,
      direction: "expense",
      categoryId: "cloud",
      source: "csv",
      ai: true,
    },
    {
      id: "sme-4",
      date: "2026-07-08",
      description: "Invoice #118 — Larder & Co",
      amount: 850_000,
      direction: "income",
      categoryId: "client-income",
      source: "csv",
    },
    {
      id: "sme-5",
      date: "2026-07-01",
      description: "Office rent — Yaba",
      amount: 595_000,
      direction: "expense",
      categoryId: "rent",
      source: "bank",
      ai: true,
    },
  ],
};

/** Mirrors the seed.ts Cuesoft Ltd narrative (July 2026 MTD). */
const COMPANY: DemoDataset = {
  persona: "company",
  label: "Company",
  currency: "NGN",
  deltaCaption: "vs Jun",
  stats: {
    net: {
      label: "Net cash flow",
      value: 4_820_400,
      delta: 0.124,
      sparkline: [3_320, 3_580, 3_460, 3_780, 4_010, 3_940, 4_290, 4_820],
    },
    income: {
      label: "Income",
      value: 8_435_200,
      delta: 0.081,
      sparkline: [6_540, 6_820, 6_700, 7_180, 7_460, 7_380, 7_803, 8_435],
    },
    expenses: {
      label: "Expenses",
      value: 3_614_800,
      delta: 0.034,
      sparkline: [3_180, 3_240, 3_300, 3_280, 3_390, 3_460, 3_496, 3_615],
    },
  },
  cashflow: {
    points: [
      2_450_000, 2_980_000, 2_760_000, 3_340_000, 3_620_000, 3_410_000,
      3_890_000, 4_240_000, 4_050_000, 4_510_000, 4_380_000, 4_820_400,
    ],
    xLabels: X_LABELS,
  },
  donut: {
    // The seed.ts Cuesoft July breakdown (top 3 + aggregated tail) — the
    // hero embed renders this donut as "the real B1 overview", so the
    // slices mirror the app's (system QA 2026-07-19). Colors are the seed
    // registry category colors (data, not styling).
    slices: [
      { id: "payroll", label: "Payroll", value: 1_850_000, color: "#C6373C" },
      {
        id: "rent",
        label: "Office rent",
        value: 650_000,
        color: "#B26A00",
      },
      {
        id: "cloud",
        label: "Cloud & software",
        value: 603_000,
        color: "#F46A1F",
      },
      { id: "other", label: "Other", value: 511_800, color: "#6E6E76" },
    ],
    centerTotal: "₦3.61M",
  },
  categories: [
    { id: "inventory", name: "Inventory", color: "#F46A1F" },
    { id: "rent", name: "Rent", color: "#2456D6" },
    { id: "utilities", name: "Utilities", color: "#B26A00" },
    { id: "cloud", name: "Cloud & software", color: "#6E6E76" },
    { id: "consulting", name: "Consulting income", color: "#1B7F4B" },
    { id: "product", name: "Product income", color: "#1B7F4B" },
  ],
  txns: [
    {
      id: "co-1",
      date: "2026-07-18",
      description: "Retainer — Kudaworks",
      amount: 3_200_000,
      direction: "income",
      categoryId: "consulting",
      source: "bank",
    },
    {
      id: "co-2",
      date: "2026-07-15",
      description: "Consulting — BlueRidge Capital",
      amount: 1_585_200,
      direction: "income",
      categoryId: "consulting",
      source: "bank",
    },
    {
      id: "co-3",
      date: "2026-07-08",
      description: "Invoice #2041 — Nairaflow",
      amount: 2_850_000,
      direction: "income",
      categoryId: "product",
      source: "csv",
    },
    {
      id: "co-4",
      date: "2026-07-06",
      description: "AWS hosting",
      amount: 438_700,
      direction: "expense",
      categoryId: "cloud",
      source: "bank",
      ai: true,
    },
    {
      id: "co-5",
      date: "2026-07-01",
      description: "Office rent — July",
      amount: 650_000,
      direction: "expense",
      categoryId: "rent",
      source: "bank",
    },
  ],
};

export const DEMO_DATASETS: Record<DemoPersona, DemoDataset> = {
  freelancer: FREELANCER,
  sme: SME,
  company: COMPANY,
};
