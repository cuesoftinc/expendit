/**
 * AnomalyBadge — design.md §3/§8.2: type icon + severity tint; variants
 * inline / feed; click opens the anomaly-explain inspector (wired by the
 * consumer). MI-5 pulse handled at first render via CSS.
 */

import React from "react";
import { ArrowUpRight, Copy, Tag, TrendingUp } from "lucide-react";
import type { AnomalySeverity, AnomalyType } from "@/models";
import { cn } from "@/lib/cn";

const TYPE_META: Record<
  AnomalyType,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  large_transaction: { label: "Large transaction", Icon: ArrowUpRight },
  spending_spike: { label: "Spending spike", Icon: TrendingUp },
  abnormal_category: { label: "Abnormal for category", Icon: Tag },
  duplicate_charge: { label: "Possible duplicate charge", Icon: Copy },
};

export interface AnomalyBadgeProps {
  type: AnomalyType;
  severity: AnomalySeverity;
  variant?: "inline" | "feed";
  /** MI-5: pulse twice on first render. */
  pulse?: boolean;
  onClick?: () => void;
}

export const AnomalyBadge: React.FC<AnomalyBadgeProps> = ({
  type,
  severity,
  variant = "inline",
  pulse = false,
  onClick,
}) => {
  const { label, Icon } = TYPE_META[type];
  const tint =
    severity === "warn"
      ? "text-warn border-warn/40 bg-warn/10"
      : "text-info border-info/40 bg-info/10";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} (${severity})`}
      data-severity={severity}
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium",
        "transition-colors duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
        tint,
        variant === "inline" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-[13px]",
        pulse && "animate-pulse [animation-iteration-count:2] motion-reduce:animate-none",
      )}
    >
      <Icon aria-hidden className={variant === "inline" ? "h-3 w-3" : "h-4 w-4"} />
      {variant === "feed" ? <span>{label}</span> : null}
    </button>
  );
};

export default AnomalyBadge;
