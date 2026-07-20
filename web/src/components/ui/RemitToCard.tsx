/**
 * RemitToCard — design.md §8.2, Figma Stage 2b: white card · tinted icon
 * well · tax title + "Remit to {authority}" caption · "Amount due" label ·
 * Display/32 tabular amount · calendar due line (T-x chip when close) ·
 * one "Pay via …" channel chip (tax-engine §"Remittance & authorities").
 */

import React from "react";
import { Calendar, Landmark } from "lucide-react";
import type { Authority, TaxKind } from "@/models";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { formatIso } from "@/lib/dates";
import { thresholdFor } from "./TaxCalendarRow";

const TAX_LABEL: Record<TaxKind, string> = {
  pit: "Personal Income Tax",
  cit: "Companies Income Tax + Development Levy",
  vat: "VAT",
};

export interface RemitToCardProps {
  kind: TaxKind;
  authority: Authority;
  amountDue: number;
  currency?: string;
  /** ISO due date. */
  dueDate: string;
  /** Days until due — shows the T-30/T-7/T-1 chip when close. */
  daysToDue?: number;
  className?: string;
}

export const RemitToCard: React.FC<RemitToCardProps> = ({
  kind,
  authority,
  amountDue,
  currency = "NGN",
  dueDate,
  daysToDue,
  className,
}) => {
  const due = formatIso(dueDate, "d MMM yyyy");
  const threshold = daysToDue === undefined ? "none" : thresholdFor(daysToDue);
  return (
    <div
      data-kind={kind}
      className={cn("rounded border border-border bg-bg p-4", className)}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent/[0.12] text-accent">
          <Landmark aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium leading-5 text-text">
            {TAX_LABEL[kind]}
          </div>
          <div
            className="truncate text-[13px] leading-4 text-text-2"
            // Short authority name in the subtitle (Figma 96:658) — the
            // full name rides the tooltip instead of truncating.
            title={authority.name}
          >
            Remit to <span className="font-mono">{authority.code}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-[13px] leading-4 text-text-2">Amount due</div>
      <div className="mt-1 text-[32px] font-bold leading-[38px] tracking-[-0.01em] tabular-nums text-text">
        {formatMoney(amountDue, currency)}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[13px] leading-4 text-text-2">
        <Calendar aria-hidden className="h-3.5 w-3.5" />
        <span className="tabular-nums">Due {due}</span>
        {threshold !== "none" ? (
          <span className="rounded-full bg-warn/[0.15] px-1.5 py-0.5 text-[11px] font-medium uppercase leading-4 text-warn">
            {threshold}
          </span>
        ) : null}
      </div>
      {authority.payment_channels.length > 0 ? (
        <div className="mt-3">
          <span className="inline-flex rounded border border-border bg-bg px-1.5 py-0.5 text-[11px] font-medium leading-4 text-text">
            Pay via {authority.payment_channels.join(" / ")}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default RemitToCard;
