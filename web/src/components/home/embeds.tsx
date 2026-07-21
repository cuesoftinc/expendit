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
import { DEMO_DATASETS, type DemoTxn } from "@/mocks/demo";
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

// Each embed depicts a different surface, so its rail highlights that
// surface (canvas parity — the A5a thumbs highlight per-surface nav).
const navFor = (active: string) => (
  <AppNav
    orgSwitcher={<OrgSwitcher orgs={EMBED_ORGS} currentOrgId="org-cuesoft" />}
  >
    <NavItem
      icon={LayoutDashboard}
      label="Overview"
      active={active === "Overview"}
    />
    <NavItem icon={ArrowLeftRight} label="Transactions" />
    <NavItem icon={Upload} label="Imports" active={active === "Imports"} />
    <NavItem icon={Landmark} label="Accounts" />
    <NavItem icon={FileText} label="Reports" />
    <NavGroupLabel>Company</NavGroupLabel>
    <NavItem icon={FileSpreadsheet} label="Statements" />
    <NavItem icon={Gauge} label="Ratios" badgeCount={3} />
    <NavGroupLabel>Taxes</NavGroupLabel>
    <NavItem
      icon={Calculator}
      label="Tax center"
      active={active === "Tax center"}
    />
    <NavItem icon={TagIcon} label="Categories" />
    <NavItem icon={Settings} label="Settings" />
  </AppNav>
);

/**
 * Latest-transactions rows in the hero embed — the seed.ts Cuesoft Ltd
 * ledger's five most recent July rows, verbatim (system QA 2026-07-19:
 * two invented rows diverged from the product the CTA leads to).
 */
const HERO_TXNS: DemoTxn[] = [
  {
    id: "hero-1",
    date: "2026-07-18",
    description: "Payroll — July",
    amount: 1_850_000,
    direction: "expense",
    categoryId: "payroll",
    source: "bank",
  },
  {
    id: "hero-2",
    date: "2026-07-18",
    description: "Workshop facilitation — DataCamp Lagos",
    amount: 800_000,
    direction: "income",
    categoryId: "workshops",
    source: "manual",
  },
  {
    id: "hero-3",
    date: "2026-07-16",
    description: "Team lunch — sprint close",
    amount: 85_000,
    direction: "expense",
    categoryId: "meals",
    source: "manual",
  },
  {
    id: "hero-4",
    date: "2026-07-15",
    description: "Consulting — BlueRidge Capital",
    amount: 1_585_200,
    direction: "income",
    categoryId: "consulting",
    source: "bank",
  },
  {
    id: "hero-5",
    date: "2026-07-14",
    description: "Equipment repair — office AC",
    amount: 95_300,
    direction: "expense",
    categoryId: "ops",
    source: "receipt",
    ai: true,
  },
];

/** Seed registry categories (colors are data — the B8 registry). */
const HERO_CATEGORIES = {
  payroll: { id: "payroll", name: "Payroll", color: "#C6373C" },
  workshops: {
    id: "workshops",
    name: "Workshops & training",
    color: "#7DA2FF",
  },
  meals: { id: "meals", name: "Meals & team", color: "#F59E0B" },
  consulting: { id: "consulting", name: "Consulting income", color: "#1B7F4B" },
  ops: { id: "ops", name: "Ops & logistics", color: "#0EA5E9" },
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
      {navFor("Overview")}
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
            <span className="text-[13px] font-medium text-accent-text">
              Prepare filing
            </span>
          }
        >
          VAT return due tomorrow — 21 Jul 2026
        </Banner>
        <div className="grid grid-cols-4 gap-3">
          {/* Deltas are the seed-computed July-vs-June values, matching
              the TEST_MODE overview at boot (June net is negative, so the
              net card carries no delta chip — the app's prev>0 rule). */}
          <StatCard
            label="Net cash flow"
            value={company.stats.net.value}
            format={(value) => formatMoney(value)}
            sparkline={company.stats.net.sparkline}
          />
          <StatCard
            label="Income"
            value={company.stats.income.value}
            format={(value) => formatMoney(value)}
            delta={-0.075}
            deltaCaption="vs Jun"
            sparkline={company.stats.income.sparkline}
          />
          <StatCard
            label="Expenses"
            deltaDirection="down-good"
            value={company.stats.expenses.value}
            format={(value) => formatMoney(value)}
            delta={-0.686}
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
                  type="abnormal_category"
                  severity="info"
                  variant="feed"
                  description="₦95,300 is 3.4× the trailing mean for Ops & logistics (₦28,000)."
                  timestamp="14 Jul"
                />
                <AnomalyBadge
                  type="large_transaction"
                  severity="warn"
                  variant="feed"
                  // "#2041" is an invoice number (seed data), not a hex color.
                  description="Invoice #2041 — Nairaflow — ₦2,850,000.00"
                  timestamp="8 Jul"
                />
              </div>
              <div className="mt-2 text-[11px] font-medium text-accent-text">
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
            <span className="text-[11px] font-medium text-accent-text">
              View all →
            </span>
          </div>
          <table className="w-full">
            <TableHeader
              columns={TXN_COLUMNS}
              density="compact"
              // Rows lead with a select cell — the sr-only header keeps
              // every td under a named th (axe `td-has-header`).
              selectHeader="Select"
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
      {navFor("Imports")}
      <div className="min-w-0 flex-1 space-y-3 overflow-hidden p-5">
        <StagedReviewHeader importCount={209} duplicateCount={5} />
        <div>
          <table className="w-full">
            <TableHeader
              columns={TXN_COLUMNS}
              density="compact"
              // Same select-cell alignment as the hero embed's table.
              selectHeader="Select"
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

/** B7 tax-center mini (A5a step-3 thumb) — seed tax narrative. */
export const TaxCenterEmbed: React.FC = () => (
  <div
    className="flex h-full w-full overflow-hidden bg-bg text-left"
    style={{ width: TAX_EMBED_WIDTH, height: TAX_EMBED_HEIGHT }}
  >
    {navFor("Tax center")}
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
          amountDue={5_474_000}
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
              kind: "cit",
              period: "FY2026",
              due_date: "2027-06-30",
              authority: FIRS,
            }}
            daysToDue={345}
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
              amount_due: 512_300,
              due_date: "2026-06-21",
              computed_fields: [],
              authority: FIRS,
              artifact_key: "receipts/tf-vat-2026-05.pdf",
              filed_at: "2026-06-19T10:00:00.000Z",
              created_at: "2026-06-15T10:00:00.000Z",
            }}
          />
          <FilingHistoryRow
            filing={{
              id: "tf-cit-fy2025",
              org_id: "org-cuesoft",
              kind: "cit",
              period: "FY2025",
              status: "accepted",
              amount_due: 5_474_000,
              due_date: "2026-06-30",
              computed_fields: [],
              authority: FIRS,
              artifact_key: "receipts/tf-cit-fy2025.pdf",
              filed_at: "2026-06-12T10:00:00.000Z",
              created_at: "2026-06-10T10:00:00.000Z",
            }}
          />
        </ul>
      </div>
    </div>
  </div>
);
