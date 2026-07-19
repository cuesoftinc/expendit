"use client";

/**
 * StatCard — design.md §3/§8.2: label · big tabular number · delta chip ·
 * sparkline (bespoke SVG per the reuse policy) · loading variant (delta +
 * sparkline off). MI-7: value changes animate a 300ms count-up, once per
 * data refresh; reduced motion renders final values.
 */

import React, { useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
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
  /** Comparison caption after the delta (Figma: "vs Jun"). */
  deltaCaption?: string;
  /**
   * Which way is good for this metric — expenses trending DOWN is good
   * (income tint), up is bad (system QA 2026-07-19: a −68.6% expense
   * delta rendered red). Icon + sign always encode the actual direction
   * (design.md §5 — never color alone).
   */
  deltaDirection?: "up-good" | "down-good";
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
    // Reduced motion renders the final value on the first frame.
    const reduce = prefersReducedMotion();
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = reduce ? 1 : Math.min(1, (now - started) / 300);
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
  deltaCaption,
  deltaDirection = "up-good",
  sparkline,
  loading = false,
  className,
}) => {
  const shown = useCountUp(value);

  // Figma card: white bg + hairline border, 16px pad, 8px stack gap.
  const card = "flex flex-col gap-2 rounded border border-border bg-bg p-4";

  if (loading) {
    return (
      <div data-loading="true" className={cn(card, className)}>
        {/* Figma loading state keeps the label; value + meta shimmer. */}
        <div className="text-[13px] leading-4 text-text-2">{label}</div>
        <Skeleton variant="stat" />
      </div>
    );
  }

  const positive = (delta ?? 0) >= 0;
  // Goodness drives color; the icon + sign keep the raw direction.
  const improving = deltaDirection === "down-good" ? !positive : positive;
  return (
    <div className={cn(card, className)}>
      <div className="text-[13px] leading-4 text-text-2">{label}</div>
      {/* Figma value: Display/32 Bold. */}
      <span className="text-[32px] font-bold leading-[38px] tracking-[-0.01em] tabular-nums text-text">
        {format(shown)}
      </span>
      {delta !== undefined || (sparkline && sparkline.length > 1) ? (
        <div className="flex w-full items-center justify-between gap-3">
          {delta !== undefined ? (
            <span
              data-testid="stat-delta"
              className={cn(
                // Figma delta pill: 12% tint, no border, Table/13 Medium.
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
                "text-[13px] font-medium leading-4 tabular-nums",
                improving
                  ? "bg-income/[0.12] text-income"
                  : "bg-expense/[0.12] text-expense",
              )}
            >
              {positive ? (
                <TrendingUp aria-hidden className="h-3 w-3" />
              ) : (
                <TrendingDown aria-hidden className="h-3 w-3" />
              )}
              {positive ? "+" : "−"}
              {Math.abs(delta * 100).toFixed(1)}%
              {deltaCaption ? <span>{deltaCaption}</span> : null}
            </span>
          ) : (
            <span />
          )}
          {sparkline && sparkline.length > 1 ? (
            <Sparkline series={sparkline} positive={improving} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default StatCard;
