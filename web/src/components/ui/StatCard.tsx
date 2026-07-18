"use client";

/**
 * StatCard — design.md §3/§8.2: label · big tabular number · delta chip ·
 * sparkline (bespoke SVG per the reuse policy) · loading variant (delta +
 * sparkline off). MI-7: value changes animate a 300ms count-up, once per
 * data refresh; reduced motion renders final values.
 */

import React, { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/use-reduced-motion";
import Skeleton from "./Skeleton";

export interface StatCardProps {
  label: string;
  /** Numeric value; formatted for display via format(). */
  value: number;
  /** Renders the animated number (defaults to locale string). */
  format?: (value: number) => string;
  /** Delta vs previous period, as a fraction (0.042 = +4.2%). */
  delta?: number;
  /** Sparkline series (bespoke SVG; omit to hide). */
  sparkline?: number[];
  loading?: boolean;
  className?: string;
}

/** MI-7 count-up: 300ms, once per value change; final value if reduced. */
const useCountUp = (target: number): number => {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target) return;
    if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
      setShown(target);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 300);
      // ease-standard-ish deceleration
      const eased = 1 - (1 - progress) ** 3;
      setShown(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
};

const Sparkline: React.FC<{ series: number[]; positive: boolean }> = ({
  series,
  positive,
}) => {
  const width = 96;
  const height = 28;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = width / Math.max(1, series.length - 1);
  const points = series
    .map(
      (value, index) =>
        `${(index * step).toFixed(1)},${(
          height -
          2 -
          ((value - min) / span) * (height - 4)
        ).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      data-testid="stat-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      className="shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        className={positive ? "stroke-income" : "stroke-expense"}
      />
    </svg>
  );
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  format = (val) => Math.round(val).toLocaleString("en-NG"),
  delta,
  sparkline,
  loading = false,
  className,
}) => {
  const shown = useCountUp(value);

  if (loading) {
    return (
      <div
        data-loading="true"
        className={cn("rounded border border-border bg-bg-elev p-4", className)}
      >
        <Skeleton variant="stat" />
      </div>
    );
  }

  const positive = (delta ?? 0) >= 0;
  return (
    <div className={cn("rounded border border-border bg-bg-elev p-4", className)}>
      <div className="text-[13px] font-medium text-text-2">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <span className="text-2xl font-semibold tabular-nums text-text">
          {format(shown)}
        </span>
        {sparkline && sparkline.length > 1 ? (
          <Sparkline series={sparkline} positive={positive} />
        ) : null}
      </div>
      {delta !== undefined ? (
        <span
          data-testid="stat-delta"
          className={cn(
            "mt-2 inline-flex items-center gap-0.5 rounded border px-1.5 py-0 text-[11px] font-medium tabular-nums",
            positive
              ? "border-income/40 bg-income/10 text-income"
              : "border-expense/40 bg-expense/10 text-expense",
          )}
        >
          {positive ? (
            <ArrowUpRight aria-hidden className="h-3 w-3" />
          ) : (
            <ArrowDownRight aria-hidden className="h-3 w-3" />
          )}
          {positive ? "+" : "−"}
          {Math.abs(delta * 100).toFixed(1)}%
        </span>
      ) : null}
    </div>
  );
};

export default StatCard;
