/**
 * ProgressBar — design.md §8.2b: determinate / indeterminate · sm/md ·
 * label slot (live txn counter MI-9; inline download progress MI-14).
 */

import React from "react";
import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  /** 0–100; omit for indeterminate. */
  value?: number;
  size?: "sm" | "md";
  label?: React.ReactNode;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = "md",
  label,
}) => {
  const determinate = value !== undefined;
  return (
    <div className="w-full">
      {label ? (
        <div className="mb-1 text-[13px] tabular-nums text-text-2">{label}</div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? Math.round(value) : undefined}
        className={cn(
          "w-full overflow-hidden rounded-full bg-bg-elev",
          size === "sm" ? "h-1" : "h-1.5",
        )}
      >
        <div
          data-testid="progress-fill"
          className={cn(
            "h-full rounded-full bg-accent transition-[width] duration-base ease-standard",
            !determinate && "w-1/3 animate-pulse motion-reduce:animate-none",
          )}
          style={
            determinate
              ? { width: `${Math.min(100, Math.max(0, value))}%` }
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default ProgressBar;
