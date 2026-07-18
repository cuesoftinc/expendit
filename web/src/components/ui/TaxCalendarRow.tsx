/**
 * TaxCalendarRow — design.md §8.2 (MI-13 data source): tax kind + period +
 * due date + T-30/T-7/T-1 escalation tint (info → warn).
 */

import React from "react";
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

const THRESHOLD_CLASSES: Record<DeadlineThreshold, string> = {
  none: "",
  "t-30": "border-info/40 bg-info/10",
  "t-7": "border-warn/40 bg-warn/10",
  "t-1": "border-expense/40 bg-expense/10",
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
  return (
    <div
      role="row"
      data-threshold={threshold}
      className={cn(
        "flex items-center gap-3 rounded border border-border px-3 py-2 text-[13px] text-text",
        THRESHOLD_CLASSES[threshold],
        className,
      )}
    >
      <span className="w-10 shrink-0 font-medium uppercase">{entry.kind}</span>
      <span className="w-24 shrink-0 tabular-nums text-text-2">
        {entry.period}
      </span>
      <span className="min-w-0 flex-1 truncate text-text-2">
        {entry.authority.name}
      </span>
      <span className="tabular-nums">due {entry.due_date}</span>
      {threshold !== "none" ? (
        <span
          className={cn(
            "rounded border px-1.5 text-[11px] font-medium uppercase",
            threshold === "t-30" && "border-info/40 text-info",
            threshold === "t-7" && "border-warn/40 text-warn",
            threshold === "t-1" && "border-expense/40 text-expense",
          )}
        >
          {threshold}
        </span>
      ) : null}
    </div>
  );
};

export default TaxCalendarRow;
