"use client";

/**
 * Product embeds — real registry compositions the marketing page frames
 * as visuals, exactly like the Figma Home frame does (A2 hero = the B1
 * overview template; A5a thumbs = B3b staged review / B1 overview / B7
 * tax center minis — "real screen thumbnails", pages.md A5a). The data
 * mirrors the seed.ts Cuesoft Ltd narrative so the visuals match the
 * TEST_MODE dashboard the CTAs lead to.
 *
 * Static, render-only compositions: decorative chrome for marketing —
 * interactive controls inside are inert (aria-hidden at the call site
 * happens via the device frame; keyboard users tab past them).
 */

import React from "react";
import {
  ArrowLeftRight,
  Calculator,
  FileSpreadsheet,
  FileText,
  Gauge,
  Landmark,
  LayoutDashboard,
  Settings,
  Tag as TagIcon,
  Upload,
} from "lucide-react";
import type { Org, TxnEntry } from "@/models";
import { DEMO_DATASETS, type DemoTxn } from "@/mock/demo";
import { formatMoney } from "@/lib/format";
import AppNav, { NavGroupLabel, NavItem } from "@/components/ui/AppNav";
import OrgSwitcher from "@/components/ui/OrgSwitcher";
import PeriodPicker from "@/components/ui/PeriodPicker";
import Banner from "@/components/ui/Banner";
import StatCard from "@/components/ui/StatCard";
import ChartLine from "@/components/ui/ChartLine";
import ChartDonut from "@/components/ui/ChartDonut";
import AnomalyBadge from "@/components/ui/AnomalyBadge";
import TableHeader from "@/components/ui/TableHeader";
import TxnTableRow from "@/components/ui/TxnTableRow";
import StagedReviewHeader from "@/components/ui/StagedReviewHeader";
import RemitToCard from "@/components/ui/RemitToCard";
import TaxCalendarRow from "@/components/ui/TaxCalendarRow";
import FilingHistoryRow from "@/components/ui/FilingHistoryRow";
import DonutLegend from "./DonutLegend";

/** Seed-narrative orgs (seed.ts): the embed shows the company org. */
const EMBED_ORGS: Org[] = [
  {
    id: "org-cuesoft",
    name: "Cuesoft Ltd",
    kind: "company",
    currency: "NGN",
    country: "NG",
    fiscal_year_end: "12-31",
    created_at: "2025-11-03T09:05:00.000Z",
  },
];

/** Converts a demo txn to the ledger entity TxnTableRow renders. */
export const toTxnEntry = (txn: DemoTxn): TxnEntry => ({
  id: txn.id,
  org_id: "demo",
  description: txn.description,
  amount: txn.amount,
  direction: txn.direction,
  category_id: txn.categoryId,
  txn_date: txn.date,
  source: txn.source,
  source_link_id: null,
  ai_categorized: txn.ai ?? false,
  excluded_from_reports: false,
  anomalies: [],
  created_at: txn.date,
});

const TXN_COLUMNS = [
  { id: "date", label: "Date", sortable: true, widthClass: "w-14" },
  { id: "src", label: "Src", widthClass: "w-8" },
  { id: "description", label: "Description" },
  { id: "category", label: "Category", sortable: true, widthClass: "w-28" },
  {
    id: "amount",
    label: "Amount",
    numeric: true,
    sortable: true,
    widthClass: "w-32",
  },
];

export { TXN_COLUMNS };

const NAV = (
  <AppNav
    orgSwitcher={<OrgSwitcher orgs={EMBED_ORGS} currentOrgId="org-cuesoft" />}
  >
    <NavItem icon={LayoutDashboard} label="Overview" active />
    <NavItem icon={ArrowLeftRight} label="Transactions" />
    <NavItem icon={Upload} label="Imports" />
    <NavItem icon={Landmark} label="Accounts" />
    <NavItem icon={FileText} label="Reports" />
    <NavGroupLabel>Company</NavGroupLabel>
    <NavItem icon={FileSpreadsheet} label="Statements" />
    <NavItem icon={Gauge} label="Ratios" badgeCount={3} />
    <NavGroupLabel>Taxes</NavGroupLabel>
    <NavItem icon={Calculator} label="Tax center" />
    <NavItem icon={TagIcon} label="Categories" />
    <NavItem icon={Settings} label="Settings" />
  </AppNav>
);

/** Latest-transactions rows in the hero embed (seed July narrative). */
const HERO_TXNS: DemoTxn[] = [
  {
    id: "hero-1",
    date: "2026-07-16",
    description: "MTN Business — data bundles",
    amount: 120_000,
    direction: "expense",
    categoryId: "utilities",
    source: "bank",
  },
  {
    id: "hero-2",
    date: "2026-07-15",
    description: "Paystack payout — web sales",
    amount: 1_845_000,
    direction: "income",
    categoryId: "product",
    source: "bank",
  },
  {
    id: "hero-3",
    date: "2026-07-15",
    description: "Consulting — BlueRidge Capital",
    amount: 1_585_200,
    direction: "income",
    categoryId: "consulting",
    source: "bank",
  },
  {
    id: "hero-4",
    date: "2026-07-06",
    description: "AWS hosting",
    amount: 438_700,
    direction: "expense",
    categoryId: "cloud",
    source: "bank",
    ai: true,
  },
  {
    id: "hero-5",
    date: "2026-07-01",
    description: "Office rent — July",
    amount: 650_000,
    direction: "expense",
    categoryId: "rent",
    source: "bank",
  },
];

const HERO_CATEGORIES = {
  utilities: { id: "utilities", name: "Utilities", color: "#B26A00" },
  product: { id: "product", name: "Sales", color: "#1B7F4B" },
  consulting: { id: "consulting", name: "Consulting", color: "#1B7F4B" },
  cloud: { id: "cloud", name: "Cloud & software", color: "#6E6E76" },
  rent: { id: "rent", name: "Rent", color: "#2456D6" },
} as const;

/*
 * Embed design sizes mirror the Stage-4 templates (1440-wide frames);
 * ScaledEmbed then reproduces the Figma embed scales exactly — the hero
 * shows B1 at 1037/1440 ≈ 0.72 (Figma hero-visual 706px tall), and the
 * A5a thumbs land at the Figma thumb heights (231 / 175 / 217 at 340w).
 */
export const DASHBOARD_EMBED_WIDTH = 1440;
export const DASHBOARD_EMBED_HEIGHT = 980;

/**
 * B1 overview embed (A2 hero visual + A5a step-2 thumb) — the Figma
 * "hero-visual — B1 embed" frame: nav rail · header + period · deadline
 * banner · stat row (incl. runway) · cash-flow line + donut + anomaly
 * feed · latest transactions.
 */
export const DashboardEmbed: React.FC = () => {
  const company = DEMO_DATASETS.company;
  return (
    <div
      className="flex h-full w-full overflow-hidden bg-bg text-left"
      style={{ width: DASHBOARD_EMBED_WIDTH, height: DASHBOARD_EMBED_HEIGHT }}
    >
      {NAV}
      <div className="min-w-0 flex-1 space-y-4 overflow-hidden p-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold tracking-tight text-text">
            Overview
          </h3>
          <div className="w-40">
            <PeriodPicker mode="month" value="2026-07" />
          </div>
        </div>
        <Banner
          kind="warn"
          action={
            <span className="text-[13px] font-medium text-accent">
              Prepare filing
            </span>
          }
        >
          VAT return due tomorrow — 21 Jul 2026
        </Banner>
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Net cash flow"
            value={company.stats.net.value}
            format={(value) => formatMoney(value)}
            delta={company.stats.net.delta}
            deltaCaption="vs Jun"
            sparkline={company.stats.net.sparkline}
          />
          <StatCard
            label="Income"
            value={company.stats.income.value}
            format={(value) => formatMoney(value)}
            delta={company.stats.income.delta}
            deltaCaption="vs Jun"
            sparkline={company.stats.income.sparkline}
          />
          <StatCard
            label="Expenses"
            value={company.stats.expenses.value}
            format={(value) => formatMoney(value)}
            delta={company.stats.expenses.delta}
            deltaCaption="vs Jun"
            sparkline={company.stats.expenses.sparkline}
          />
          <StatCard
            label="Runway"
            value={7.2}
            format={(value) => `${value.toFixed(1)} months`}
            delta={0.004}
            deltaCaption="vs Jun"
            sparkline={[6.4, 6.6, 6.5, 6.8, 6.9, 7.0, 7.1, 7.2]}
          />
        </div>
        <div className="grid grid-cols-[3fr_2fr] gap-4">
          <div className="rounded border border-border p-4">
            <div className="mb-2 text-[13px] font-medium text-text">
              Cash flow — 12 months
            </div>
            <ChartLine
              series={[
                {
                  id: "cashflow",
                  label: "Net cash flow",
                  color: "accent",
                  points: company.cashflow.points,
                },
              ]}
              xLabels={company.cashflow.xLabels}
              height={180}
            />
          </div>
          <div className="space-y-3">
            <div className="rounded border border-border p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-2">
                Expenses by category — Jul 2026
              </div>
              <div className="flex items-center gap-4">
                <ChartDonut
                  slices={company.donut.slices}
                  centerTotal={company.donut.centerTotal}
                  centerCaption="Expenses"
                  legend="none"
                />
                <DonutLegend
                  slices={company.donut.slices}
                  className="min-w-0 flex-1"
                />
              </div>
            </div>
            <div className="rounded border border-border p-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-2">
                Anomalies
              </div>
              <div className="space-y-2">
                <AnomalyBadge
                  type="large_transaction"
                  severity="warn"
                  variant="feed"
                  description="₦480,000.00 is 3.4× your median for Equipment"
                  timestamp="6d"
                />
                <AnomalyBadge
                  type="duplicate_charge"
                  severity="info"
                  variant="feed"
                  description="Same amount & merchant as txn 2 minutes earlier"
                  timestamp="12d"
                />
              </div>
              <div className="mt-2 text-[11px] font-medium text-accent">
                Explain in ledger →
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-text">
              Latest transactions
            </span>
            <span className="text-[11px] font-medium text-accent">
              View all →
            </span>
          </div>
          <table className="w-full">
            <TableHeader
              columns={TXN_COLUMNS}
              density="compact"
              sort={{ columnId: "date", direction: "desc" }}
            />
            <tbody className="contents">
              {HERO_TXNS.map((txn) => (
                <TxnTableRow
                  key={txn.id}
                  txn={toTxnEntry(txn)}
                  category={
                    HERO_CATEGORIES[
                      txn.categoryId as keyof typeof HERO_CATEGORIES
                    ]
                  }
                  density="compact"
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const IMPORT_EMBED_WIDTH = 1440;
export const IMPORT_EMBED_HEIGHT = 740;

/** B3b staged-review mini (A5a step-1 thumb). */
export const ImportReviewEmbed: React.FC = () => {
  const freelancer = DEMO_DATASETS.freelancer;
  return (
    <div
      className="flex h-full w-full overflow-hidden bg-bg text-left"
      style={{ width: IMPORT_EMBED_WIDTH, height: IMPORT_EMBED_HEIGHT }}
    >
      {NAV}
      <div className="min-w-0 flex-1 space-y-3 overflow-hidden p-5">
        <StagedReviewHeader importCount={209} duplicateCount={5} />
        <div>
          <table className="w-full">
            <TableHeader
              columns={TXN_COLUMNS}
              density="compact"
              sort={{ columnId: "date", direction: "desc" }}
            />
            <tbody className="contents">
              {freelancer.txns.map((txn, index) => (
                <TxnTableRow
                  key={txn.id}
                  txn={toTxnEntry(txn)}
                  category={
                    freelancer.categories.find(
                      (category) => category.id === txn.categoryId,
                    ) ?? freelancer.categories[0]
                  }
                  density="compact"
                  stagedDuplicate={index === freelancer.txns.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-text-2">
          209 rows will join your ledger. Discarded duplicates stay recoverable
          for 30 days.
        </p>
      </div>
    </div>
  );
};

export const TAX_EMBED_WIDTH = 1440;
export const TAX_EMBED_HEIGHT = 920;

const FIRS = {
  code: "FIRS",
  name: "Federal Inland Revenue Service",
  payment_channels: ["TaxPro-Max", "Remita"],
};

const LIRS = {
  code: "LIRS",
  name: "Lagos State Internal Revenue Service",
  payment_channels: ["eTax portal"],
};

/** B7 tax-center mini (A5a step-3 thumb) — seed tax narrative. */
export const TaxCenterEmbed: React.FC = () => (
  <div
    className="flex h-full w-full overflow-hidden bg-bg text-left"
    style={{ width: TAX_EMBED_WIDTH, height: TAX_EMBED_HEIGHT }}
  >
    {NAV}
    <div className="min-w-0 flex-1 space-y-4 overflow-hidden p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-tight text-text">
          Tax center
        </h3>
        <span className="truncate text-[11px] text-text-2">
          Jurisdiction: Nigeria · Lagos State · TIN 1042-6683-01 · RC 1782344
        </span>
      </div>
      <Banner kind="warn">VAT return due tomorrow — 21 Jul 2026</Banner>
      <div className="grid max-w-xl grid-cols-2 gap-3">
        <RemitToCard
          kind="vat"
          authority={FIRS}
          amountDue={550_600}
          dueDate="2026-07-21"
          daysToDue={1}
        />
        <RemitToCard
          kind="cit"
          authority={FIRS}
          amountDue={6_214_900}
          dueDate="2027-06-30"
        />
      </div>
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-2">
          Filing calendar
        </div>
        <ul className="list-none space-y-1.5">
          <TaxCalendarRow
            entry={{
              kind: "vat",
              period: "2026-06",
              due_date: "2026-07-21",
              authority: FIRS,
            }}
            daysToDue={1}
          />
          <TaxCalendarRow
            entry={{
              kind: "vat",
              period: "2026-07",
              due_date: "2026-08-21",
              authority: FIRS,
            }}
            daysToDue={32}
          />
          <TaxCalendarRow
            entry={{
              kind: "pit",
              period: "FY2026",
              due_date: "2027-03-31",
              authority: LIRS,
            }}
            daysToDue={254}
          />
        </ul>
      </div>
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-2">
          Filing history
        </div>
        <ul className="list-none rounded border border-border">
          <FilingHistoryRow
            filing={{
              id: "tf-vat-2026-05",
              org_id: "org-cuesoft",
              kind: "vat",
              period: "2026-05",
              status: "accepted",
              amount_due: 421_300,
              due_date: "2026-06-21",
              computed_fields: [],
              authority: FIRS,
              artifact_key: "receipts/tf-vat-2026-05.pdf",
              filed_at: "2026-06-18T10:00:00.000Z",
              created_at: "2026-06-15T10:00:00.000Z",
            }}
          />
          <FilingHistoryRow
            filing={{
              id: "tf-vat-2026-04",
              org_id: "org-cuesoft",
              kind: "vat",
              period: "2026-04",
              status: "accepted",
              amount_due: 386_750,
              due_date: "2026-05-21",
              computed_fields: [],
              authority: FIRS,
              artifact_key: "receipts/tf-vat-2026-04.pdf",
              filed_at: "2026-05-19T10:00:00.000Z",
              created_at: "2026-05-15T10:00:00.000Z",
            }}
          />
        </ul>
      </div>
    </div>
  </div>
);
