/**
 * TaxCalendarRow — design.md §8.2 (MI-13 data source), Figma Stage 2b:
 * calendar icon + "KIND · period" + right-aligned "Due …" date + an
 * escalation chip ("Due in 30 days" info → "Due in 7 days" warn → "Due
 * tomorrow" warn, stronger). Row surface tints with the threshold.
 */

import React from "react";
import { Calendar } from "lucide-react";
import { formatIso } from "@/lib/dates";
import type { TaxCalendarEntry } from "@/models";
import { cn } from "@/lib/cn";

export type DeadlineThreshold = "none" | "t-30" | "t-7" | "t-1";

/** Escalation threshold from days-to-due (MI-13). */
export const thresholdFor = (daysToDue: number): DeadlineThreshold => {
  if (daysToDue <= 1) return "t-1";
  if (daysToDue <= 7) return "t-7";
  if (daysToDue <= 30) return "t-30";
  return "none";
};

// Figma escalation: info tint → warn tint → warn, stronger (T-1 stays
// warn, not expense).
const ROW_CLASSES: Record<DeadlineThreshold, string> = {
  none: "border-border bg-bg",
  "t-30": "border-info/35 bg-info/[0.08]",
  "t-7": "border-warn/35 bg-warn/[0.08]",
  "t-1": "border-warn/50 bg-warn/[0.12]",
};

const ICON_CLASSES: Record<DeadlineThreshold, string> = {
  none: "text-text-2",
  "t-30": "text-info",
  "t-7": "text-warn-text",
  "t-1": "text-warn-text",
};

const CHIP_META: Record<
  Exclude<DeadlineThreshold, "none">,
  { label: string; className: string }
> = {
  "t-30": { label: "Due in 30 days", className: "bg-info/[0.12] text-info" },
  "t-7": { label: "Due in 7 days", className: "bg-warn/[0.12] text-warn-text" },
  "t-1": { label: "Due tomorrow", className: "bg-warn/[0.2] text-warn-text" },
};

export interface TaxCalendarRowProps {
  entry: TaxCalendarEntry;
  /** Days until due, drives the escalation tint. */
  daysToDue: number;
  className?: string;
}

export const TaxCalendarRow: React.FC<TaxCalendarRowProps> = ({
  entry,
  daysToDue,
  className,
}) => {
  const threshold = thresholdFor(daysToDue);
  const due = formatIso(entry.due_date, "d MMM yyyy");
  return (
    // Semantic list row (W3 directive): the tax calendar composes <ul>.
    <li
      data-threshold={threshold}
      title={entry.authority.name}
      className={cn(
        "flex items-center gap-2.5 rounded border px-3 py-2 text-[13px] text-text",
        ROW_CLASSES[threshold],
        className,
      )}
    >
      <Calendar
        aria-hidden
        className={cn("h-4 w-4 shrink-0", ICON_CLASSES[threshold])}
      />
      <span className="min-w-0 flex-1 truncate font-medium">
        {entry.kind.toUpperCase()}
        <span className="font-normal text-text-2"> · {entry.period}</span>
      </span>
      <span className="tabular-nums text-text-2">Due {due}</span>
      {threshold !== "none" ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-4",
            CHIP_META[threshold].className,
          )}
        >
          {CHIP_META[threshold].label}
        </span>
      ) : null}
    </li>
  );
};

export default TaxCalendarRow;
