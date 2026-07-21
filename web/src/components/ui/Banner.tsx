/**
 * Banner — design.md §8.2: persistent; info / warn (MI-13 deadline
 * T-30/T-7/T-1 escalating tints) / error (reauth). Dismiss snoozes to the
 * next threshold (consumer-owned).
 */

import React from "react";
import { Calendar, Landmark, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type BannerKind = "info" | "warn" | "error";

export interface BannerProps {
  kind?: BannerKind;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}

// Figma Banner (node 58:109): kind tint at 10%, kind edge at 35%; message
// stays body text color — only icon and action carry the kind color.
const KIND_CLASSES: Record<BannerKind, string> = {
  info: "border-info/35 bg-info/10",
  warn: "border-warn/35 bg-warn/10",
  error: "border-expense/35 bg-expense/10",
};

const KIND_ICON_CLASSES: Record<BannerKind, string> = {
  info: "text-info",
  warn: "text-warn",
  error: "text-expense",
};

// Figma icons: info = sparkles (AI), warn = calendar (deadline),
// error = landmark (bank).
const KIND_ICON: Record<
  BannerKind,
  React.ComponentType<{ className?: string }>
> = {
  info: Sparkles,
  warn: Calendar,
  error: Landmark,
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
        "flex items-center gap-2.5 rounded border px-4 py-2.5 text-sm",
        KIND_CLASSES[kind],
      )}
    >
      <Icon
        aria-hidden
        className={cn("h-4 w-4 shrink-0", KIND_ICON_CLASSES[kind])}
      />
      <div className="flex-1 text-text">{children}</div>
      {action ? (
        <div
          className={cn(
            "shrink-0 text-[13px] font-medium leading-4",
            kind === "error" ? "text-expense-text" : "text-accent-text",
          )}
        >
          {action}
        </div>
      ) : null}
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
