"use client";

/**
 * A4a — Feature deep-dives: benefit-led rows in alternating editorial
 * splits (claim → outcome copy → product still). Stills are live registry
 * compositions (the Figma frame instances), revealed on scroll-into-view
 * and static under reduced motion.
 */

import React from "react";
import { CircleCheck } from "lucide-react";
import AnomalyBadge from "@/components/ui/AnomalyBadge";
import Button from "@/components/ui/Button";
import RatioGauge from "@/components/ui/RatioGauge";
import RemitToCard from "@/components/ui/RemitToCard";
import ReportArtifactRow from "@/components/ui/ReportArtifactRow";
import { SectionInner } from "./Section";
import Reveal from "./Reveal";
import { cn } from "@/lib/cn";

interface DeepDive {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  /** Figma alternation: copy left (visual right) or copy right. */
  copySide: "left" | "right";
}

/** A4a row 1 visual — the MI-2 completion card (Figma 201:2210 override). */
const ImportCompleteCard: React.FC = () => (
  <div className="flex w-full flex-col items-center gap-2 rounded border border-border bg-bg p-8 text-center">
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-income/[0.12] text-income">
      <CircleCheck aria-hidden className="h-5 w-5" />
    </span>
    <p className="text-sm font-semibold text-text">214 transactions found</p>
    <p className="text-[13px] text-text-2">
      209 ready · 5 possible duplicates flagged
    </p>
    <Button kind="primary" size="sm">
      Review import
    </Button>
  </div>
);

const DEEP_DIVES: DeepDive[] = [
  {
    eyebrow: "Capture",
    title: "Every statement, one pipeline",
    body: "Drop CSVs, PDFs, even photographed receipts — or link GTBank, Access, Zenith and 100+ banks through Mono’s secure widget. Everything lands in one staged review before it touches your ledger, so nothing imports behind your back.",
    copySide: "left",
    visual: <ImportCompleteCard />,
  },
  {
    eyebrow: "Intelligence",
    title: "AI that categorizes — and flags what’s off",
    body: "Every transaction gets a category, marked ✨ until you confirm it. Anomaly rules catch outsized payments, category spikes and double-billing — and each flag shows the math behind it.",
    copySide: "right",
    visual: (
      <div className="w-full max-w-sm space-y-3">
        <AnomalyBadge
          type="spending_spike"
          severity="warn"
          variant="feed"
          description="Dining out is up 62% vs last month"
          timestamp="2h"
        />
        <AnomalyBadge
          type="duplicate_charge"
          severity="info"
          variant="feed"
          description="Same amount & merchant as txn 2 minutes earlier"
          timestamp="2h"
        />
      </div>
    ),
  },
  {
    eyebrow: "Company financials",
    title: "From balance sheet to boardroom answers",
    body: "Map statements to a canonical line-item model and get 22 ratios and metrics across liquidity, solvency, profitability, efficiency and cash flow. Every figure is traceable to its source lines, with benchmark bands for context.",
    copySide: "left",
    visual: (
      <div className="w-full max-w-[260px] rounded border border-border bg-bg p-4">
        <RatioGauge
          label="Current ratio"
          value={1.82}
          display="1.82"
          min={0}
          max={3.5}
          status="healthy"
          band={{ from: 1.5, to: 3.0 }}
          delta={0.21}
          deltaCaption="vs Q1"
          caption="Benchmark 1.5–3.0 · general guidance"
          formula="Current ratio = current assets ÷ current liabilities"
        />
      </div>
    ),
  },
  {
    eyebrow: "Nigerian taxes",
    title: "PIT, CIT and VAT — computed, not guessed",
    body: "Tax rules ship as data: rates, bands and deadlines for FIRS and every State IRS. Expendit computes what you owe from your actual ledger, then prints the remittance sheet that names the authority, the amount and the payment channel.",
    copySide: "right",
    visual: (
      <div className="w-full max-w-sm">
        <RemitToCard
          kind="vat"
          authority={{
            code: "FIRS",
            name: "Federal Inland Revenue Service",
            payment_channels: ["TaxPro-Max", "Remita"],
          }}
          amountDue={550_600}
          dueDate="2026-07-21"
          daysToDue={1}
        />
      </div>
    ),
  },
  {
    eyebrow: "Reports",
    title: "Exports your accountant will actually open",
    body: "Monthly summaries, cash-movement reports and category deep-dives as PDF or CSV — plus full financial statements. Generate on demand; regenerate any time.",
    copySide: "left",
    visual: (
      <ul className="w-full max-w-md list-none rounded border border-border bg-bg">
        <ReportArtifactRow
          artifact={{
            id: "ra-monthly-2026-06",
            org_id: "demo",
            kind: "monthly_summary",
            format: "pdf",
            period: "2026-06",
            params: {},
            status: "ready",
            signed_url: "#",
            created_at: "2026-07-18T09:00:00.000Z",
            expires_at: "2026-08-17T09:00:00.000Z",
          }}
          isNew
        />
      </ul>
    ),
  },
];

export const DeepDivesSection: React.FC = () => (
  <section className="bg-bg pb-24">
    <SectionInner className="space-y-20">
      {DEEP_DIVES.map((dive) => (
        <div
          key={dive.title}
          className="grid grid-cols-1 items-center gap-10 md:grid-cols-2"
        >
          <div
            className={cn(
              "max-w-[480px]",
              dive.copySide === "right" && "md:order-2",
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {dive.eyebrow}
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-text">
              {dive.title}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-text-2">
              {dive.body}
            </p>
          </div>
          <Reveal
            className={cn(
              "flex justify-center",
              dive.copySide === "right" && "md:order-1",
            )}
          >
            {dive.visual}
          </Reveal>
        </div>
      ))}
    </SectionInner>
  </section>
);

export default DeepDivesSection;
