/**
 * Toast — design.md §3/§8.2: kind info / warn / error; transient (the
 * toast half of the Toast/Banner atom). Placement/stacking owned by the
 * consumer at z-toast.
 */

import React from "react";
import { CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastKind = "info" | "warn" | "error";

export interface ToastProps {
  kind?: ToastKind;
  children: React.ReactNode;
  onDismiss?: () => void;
}

const KIND_META: Record<
  ToastKind,
  { Icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  info: { Icon: Info, tint: "text-info" },
  warn: { Icon: TriangleAlert, tint: "text-warn" },
  error: { Icon: CircleAlert, tint: "text-expense" },
};

export const Toast: React.FC<ToastProps> = ({
  kind = "info",
  children,
  onDismiss,
}) => {
  const { Icon, tint } = KIND_META[kind];
  return (
    <div
      role="status"
      data-kind={kind}
      className="flex w-80 items-start gap-2 rounded border border-border bg-bg p-3 shadow-lg"
    >
      <Icon aria-hidden className={cn("mt-0.5 h-4 w-4 shrink-0", tint)} />
      <div className="flex-1 text-[13px] text-text">{children}</div>
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
