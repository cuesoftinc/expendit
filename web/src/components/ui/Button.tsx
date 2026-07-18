"use client";

/**
 * Button — design.md §8.2: kind primary (accent) / quiet / destructive /
 * danger-armed (MI-15 countdown) · md/sm · default/pressed/disabled/
 * loading. Primary/destructive labels bind to on-accent.
 */

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type ButtonKind = "primary" | "quiet" | "destructive" | "danger-armed";
export type ButtonSize = "md" | "sm";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  kind?: ButtonKind;
  size?: ButtonSize;
  loading?: boolean;
  /** MI-15: seconds the danger-armed button stays locked before firing. */
  armedSeconds?: number;
  className?: string;
}

const KIND_CLASSES: Record<ButtonKind, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90 active:opacity-80",
  quiet:
    "bg-transparent text-text border border-border hover:bg-bg-elev active:bg-bg-elev",
  destructive:
    "bg-expense text-on-accent hover:opacity-90 active:opacity-80",
  "danger-armed": "bg-expense text-on-accent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-[13px]",
};

export const Button: React.FC<ButtonProps> = ({
  kind = "primary",
  size = "md",
  loading = false,
  armedSeconds = 5,
  disabled,
  children,
  className,
  onClick,
  ...rest
}) => {
  // MI-15: danger-armed counts down 5s before the action can fire.
  const [countdown, setCountdown] = useState(
    kind === "danger-armed" ? armedSeconds : 0,
  );

  useEffect(() => {
    if (kind !== "danger-armed" || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [kind, countdown]);

  const armed = kind === "danger-armed" && countdown > 0;
  const isDisabled = disabled || loading || armed;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded font-medium",
        "transition-colors duration-fast ease-standard select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        KIND_CLASSES[kind],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          data-testid="button-spinner"
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-accent/40 border-t-on-accent motion-reduce:animate-none"
        />
      ) : null}
      <span>{children}</span>
      {armed ? (
        <span data-testid="button-countdown" className="tabular-nums">
          ({countdown})
        </span>
      ) : null}
    </button>
  );
};

export default Button;
