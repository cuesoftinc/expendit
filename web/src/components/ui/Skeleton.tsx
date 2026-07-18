/**
 * Skeleton set — design.md §8.2b (MI-12): table row shimmer (density ×2),
 * chart axis-only, text / stat block. Shimmer respects reduced motion.
 */

import React from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps {
  variant?: "text" | "stat" | "row" | "chart";
  density?: "compact" | "comfortable";
  className?: string;
}

const shimmer =
  "animate-pulse rounded bg-bg-elev motion-reduce:animate-none";

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  density = "comfortable",
  className,
}) => {
  if (variant === "row") {
    return (
      <div
        data-testid="skeleton-row"
        className={cn(
          "flex w-full items-center gap-4 border-b border-border px-4",
          density === "compact" ? "h-[32px]" : "h-[44px]",
          className,
        )}
      >
        <span className={cn(shimmer, "h-3 w-20")} />
        <span className={cn(shimmer, "h-3 flex-1")} />
        <span className={cn(shimmer, "h-3 w-16")} />
        <span className={cn(shimmer, "h-3 w-24")} />
      </div>
    );
  }
  if (variant === "chart") {
    // MI-12: charts load axis-first.
    return (
      <div
        data-testid="skeleton-chart"
        className={cn("relative h-40 w-full", className)}
      >
        <span className="absolute bottom-0 left-0 h-px w-full bg-border" />
        <span className="absolute bottom-0 left-0 h-full w-px bg-border" />
      </div>
    );
  }
  if (variant === "stat") {
    return (
      <div data-testid="skeleton-stat" className={cn("space-y-2", className)}>
        <span className={cn(shimmer, "block h-3 w-24")} />
        <span className={cn(shimmer, "block h-7 w-36")} />
      </div>
    );
  }
  return (
    <span
      data-testid="skeleton-text"
      className={cn(shimmer, "block h-3 w-full", className)}
    />
  );
};

export default Skeleton;
