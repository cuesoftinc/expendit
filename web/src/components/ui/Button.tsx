"use client";

/**
 * Button — design.md §8.2: kind primary (accent) / quiet / quiet-danger /
 * destructive / danger-armed (MI-15 countdown) · md/sm · default/pressed/
 * disabled/loading. Primary/destructive labels bind to on-accent.
 * Danger-affordance ladder (SKILL.md, ratified 2026-07-20): row-level
 * destructive actions use quiet-danger (danger TEXT on quiet chrome —
 * Figma "Button (quiet-danger)"); filled destructive is reserved for
 * armed/confirm surfaces.
 */

import React, { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonKind =
  "primary" | "quiet" | "quiet-danger" | "destructive" | "danger-armed";
export type ButtonSize = "md" | "sm";

export interface ButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> {
  kind?: ButtonKind;
  size?: ButtonSize;
  loading?: boolean;
  /** MI-15: seconds the danger-armed button stays locked before firing. */
  armedSeconds?: number;
  className?: string;
}

// Figma Stage 1 Atoms — Button set (node 53:118): quiet is borderless
// (pressed/hover show bg-elev only); primary/destructive dim via fill.
const KIND_CLASSES: Record<ButtonKind, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90 active:opacity-80",
  quiet: "bg-transparent text-text hover:bg-bg-elev active:bg-bg-elev",
  // Quiet chrome, danger text — the ladder's row-level destructive
  // affordance (canvas: empty fills + expense-bound label).
  "quiet-danger":
    "bg-transparent text-expense hover:bg-bg-elev active:bg-bg-elev",
  destructive: "bg-expense text-on-accent hover:opacity-90 active:opacity-80",
  "danger-armed": "bg-expense text-on-accent",
};

// Figma: md = 36px / 16px pad / Body 14 Medium; sm = 28px / 12px pad /
// Table 13 Medium.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "h-9 px-4 text-sm",
  sm: "h-7 px-3 text-[13px]",
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
        // whitespace-nowrap: labels never wrap (Figma buttons are
        // single-line) — a narrow column squeezed "Try the sandbox" out
        // of its pill on the A10 mobile comparison (live QA 2026-07-19).
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium",
        "transition-colors duration-fast ease-standard select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        // Figma: only the true disabled state pales — loading and the
        // armed countdown keep the full fill.
        disabled && "opacity-60",
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
          // currentColor arc so the spinner also reads on quiet buttons.
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      ) : null}
      {kind === "danger-armed" && !loading ? (
        <TriangleAlert aria-hidden className="h-4 w-4" />
      ) : null}
      <span>{children}</span>
      {armed ? (
        <span
          data-testid="button-countdown"
          // Figma countdown pill: on-accent 25% tint, 13px medium.
          className="rounded-full bg-on-accent/25 px-1.5 py-0.5 text-[13px] font-medium leading-4 tabular-nums"
        >
          {countdown}s
        </span>
      ) : null}
    </button>
  );
};

export default Button;
