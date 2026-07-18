"use client";

/**
 * StampedCheck — design.md §8.2b (MI-10): filing success stamp; md/lg.
 * The stamp-in is motion (scale-settle), not a variant axis; reduced
 * motion renders the final state.
 */

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export interface StampedCheckProps {
  size?: "md" | "lg";
  /** Accessible label; defaults to the filing-success meaning. */
  label?: string;
  className?: string;
}

export const StampedCheck: React.FC<StampedCheckProps> = ({
  size = "md",
  label = "Filed",
  className,
}) => {
  const reduced = useReducedMotion();
  return (
    <span
      role="img"
      aria-label={label}
      data-size={size}
      className={cn(
        "inline-flex items-center justify-center rounded-full border-2 border-income text-income",
        size === "md" ? "h-10 w-10" : "h-16 w-16",
        !reduced && "animate-stamp-in motion-reduce:animate-none",
        className,
      )}
    >
      <Check
        aria-hidden
        strokeWidth={3}
        className={size === "md" ? "h-5 w-5" : "h-8 w-8"}
      />
    </span>
  );
};

export default StampedCheck;
