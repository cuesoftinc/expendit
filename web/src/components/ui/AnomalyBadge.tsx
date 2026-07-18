/**
 * AnomalyBadge — design.md §3/§8.2, Figma Stage 1 Atoms (node 57:86):
 * inline = borderless pill (12% type tint, 12px icon, Table/13 Medium
 * short label); feed = bordered card with a 32px tinted icon well, title +
 * description copy and a timestamp. Tint keys off the anomaly TYPE
 * (large txn/duplicate = warn, spike = expense, unusual category = info).
 * Click opens the anomaly-explain inspector (wired by the consumer).
 * MI-5 pulse handled at first render via CSS.
 */

import React from "react";
import { Receipt, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import type { AnomalySeverity, AnomalyType } from "@/models";
import { cn } from "@/lib/cn";

const TYPE_META: Record<
  AnomalyType,
  {
    label: string;
    shortLabel: string;
    Icon: React.ComponentType<{ className?: string }>;
    tone: "warn" | "expense" | "info";
  }
> = {
  large_transaction: {
    label: "Large transaction",
    shortLabel: "Large txn",
    Icon: TriangleAlert,
    tone: "warn",
  },
  spending_spike: {
    label: "Spending spike",
    shortLabel: "Spike",
    Icon: TrendingUp,
    tone: "expense",
  },
  abnormal_category: {
    label: "Unusual category",
    shortLabel: "Unusual category",
    Icon: Sparkles,
    tone: "info",
  },
  duplicate_charge: {
    label: "Possible duplicate",
    shortLabel: "Duplicate",
    Icon: Receipt,
    tone: "warn",
  },
};

const TONE_TEXT: Record<string, string> = {
  warn: "text-warn",
  expense: "text-expense",
  info: "text-info",
};

const TONE_TINT: Record<string, string> = {
  warn: "bg-warn/[0.12]",
  expense: "bg-expense/[0.12]",
  info: "bg-info/[0.12]",
};

export interface AnomalyBadgeProps {
  type: AnomalyType;
  severity: AnomalySeverity;
  variant?: "inline" | "feed";
  /** Feed variant: explanation line under the title. */
  description?: string;
  /** Feed variant: relative timestamp, e.g. "2h". */
  timestamp?: string;
  /** MI-5: pulse twice on first render. */
  pulse?: boolean;
  onClick?: () => void;
}

export const AnomalyBadge: React.FC<AnomalyBadgeProps> = ({
  type,
  severity,
  variant = "inline",
  description,
  timestamp,
  pulse = false,
  onClick,
}) => {
  const { label, shortLabel, Icon, tone } = TYPE_META[type];

  if (variant === "feed") {
    return (
      <button
        type="button"
        onClick={onClick}
        data-severity={severity}
        className={cn(
          "flex w-full items-start gap-3 rounded border border-border bg-bg px-3 py-2.5 text-left",
          "transition-colors duration-fast ease-standard",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
          pulse &&
            "animate-pulse [animation-iteration-count:2] motion-reduce:animate-none",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded",
            TONE_TINT[tone],
            TONE_TEXT[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px] leading-4">
          <span className="font-medium text-text">{label}</span>
          {description ? (
            <span className="text-text-2">{description}</span>
          ) : null}
        </span>
        {timestamp ? (
          <span className="shrink-0 text-[13px] leading-4 text-text-2">
            {timestamp}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} (${severity})`}
      data-severity={severity}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
        "text-[13px] font-medium leading-4",
        "transition-colors duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
        TONE_TEXT[tone],
        TONE_TINT[tone],
        pulse &&
          "animate-pulse [animation-iteration-count:2] motion-reduce:animate-none",
      )}
    >
      <Icon aria-hidden className="h-3 w-3" />
      <span>{shortLabel}</span>
    </button>
  );
};

export default AnomalyBadge;
