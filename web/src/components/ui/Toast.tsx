/**
 * Toast — design.md §3/§8.2: kind info / warn / error; transient (the
 * toast half of the Toast/Banner atom). Placement/stacking owned by the
 * consumer at z-toast.
 */

import React from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastKind = "info" | "warn" | "error";

export interface ToastProps {
  kind?: ToastKind;
  children: React.ReactNode;
  /** Inline action label ("Download", "Retry") — accent, 13 medium. */
  action?: React.ReactNode;
  onDismiss?: () => void;
}

// Figma Toast (node 58:72): info = check, warn = alert-triangle,
// error = x, each in the kind color on a plain elevated card.
const KIND_META: Record<
  ToastKind,
  { Icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  info: { Icon: Check, tint: "text-info" },
  warn: { Icon: TriangleAlert, tint: "text-warn" },
  error: { Icon: X, tint: "text-expense" },
};

export const Toast: React.FC<ToastProps> = ({
  kind = "info",
  children,
  action,
  onDismiss,
}) => {
  const { Icon, tint } = KIND_META[kind];
  return (
    <div
      role="status"
      data-kind={kind}
      className="flex w-[400px] max-w-full items-center gap-2.5 rounded border border-border bg-bg p-3 shadow-[0px_8px_12px_0px_rgba(0,0,0,0.16)]"
    >
      <Icon aria-hidden className={cn("h-4 w-4 shrink-0", tint)} />
      <div className="flex-1 text-sm font-medium leading-5 text-text">
        {children}
      </div>
      {action ? (
        <div className="shrink-0 text-[13px] font-medium leading-4 text-accent-text">
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

export default Toast;
