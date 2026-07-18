/**
 * Banner — design.md §8.2: persistent; info / warn (MI-13 deadline
 * T-30/T-7/T-1 escalating tints) / error (reauth). Dismiss snoozes to the
 * next threshold (consumer-owned).
 */

import React from "react";
import { CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type BannerKind = "info" | "warn" | "error";

export interface BannerProps {
  kind?: BannerKind;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}

const KIND_CLASSES: Record<BannerKind, string> = {
  info: "border-info/40 bg-info/10 text-info",
  warn: "border-warn/40 bg-warn/10 text-warn",
  error: "border-expense/40 bg-expense/10 text-expense",
};

const KIND_ICON: Record<
  BannerKind,
  React.ComponentType<{ className?: string }>
> = {
  info: Info,
  warn: TriangleAlert,
  error: CircleAlert,
};

export const Banner: React.FC<BannerProps> = ({
  kind = "info",
  children,
  action,
  onDismiss,
}) => {
  const Icon = KIND_ICON[kind];
  return (
    <div
      role="status"
      data-kind={kind}
      className={cn(
        "flex items-center gap-2 rounded border px-3 py-2 text-[13px]",
        KIND_CLASSES[kind],
      )}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <div className="flex-1 text-text">{children}</div>
      {action}
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="rounded p-0.5 text-text-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
};

export default Banner;
