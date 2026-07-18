"use client";

/**
 * Chart/Line — design.md §8.2b: state loading (axis-first, MI-12) / data /
 * empty. Bespoke SVG per the reuse policy (no chart libraries); series
 * colors bind to --income/--expense/--accent (web-implementation.md §3).
 * Content kinds (12mo cash-flow / ratio + line-item trend) arrive via
 * props; the data-table toggle attaches at screen assembly.
 */

import React from "react";
import { cn } from "@/lib/cn";
import Skeleton from "./Skeleton";
import EmptyState, { type EmptyStateKind } from "./EmptyState";

export type ChartSeriesColor = "income" | "expense" | "accent";

export interface ChartLineSeries {
  id: string;
  label: string;
  color: ChartSeriesColor;
  points: number[];
}

export interface ChartLineProps {
  state?: "loading" | "data" | "empty";
  series?: ChartLineSeries[];
  /** X axis tick labels (e.g. months). */
  xLabels?: string[];
  /** Empty-state surface kind (MI-16). */
  emptyKind?: EmptyStateKind;
  onEmptyAction?: () => void;
  height?: number;
  className?: string;
}

const COLOR_STROKE: Record<ChartSeriesColor, string> = {
  income: "stroke-income",
  expense: "stroke-expense",
  accent: "stroke-accent",
};

const COLOR_BG: Record<ChartSeriesColor, string> = {
  income: "bg-income",
  expense: "bg-expense",
  accent: "bg-accent",
};

const WIDTH = 480;

export const ChartLine: React.FC<ChartLineProps> = ({
  state = "data",
  series = [],
  xLabels = [],
  emptyKind = "transactions",
  onEmptyAction,
  height = 160,
  className,
}) => {
  if (state === "loading") {
    // MI-12: axis-first loading.
    return <Skeleton variant="chart" className={className} />;
  }
  if (state === "empty" || series.length === 0) {
    return (
      <EmptyState
        kind={emptyKind}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  const all = series.flatMap((entry) => entry.points);
  const min = Math.min(...all, 0);
  const max = Math.max(...all);
  const span = max - min || 1;
  const plotHeight = height - 24;

  const toPoints = (points: number[]): string => {
    const step = WIDTH / Math.max(1, points.length - 1);
    return points
      .map(
        (value, index) =>
          `${(index * step).toFixed(1)},${(
            plotHeight -
            4 -
            ((value - min) / span) * (plotHeight - 8)
          ).toFixed(1)}`,
      )
      .join(" ");
  };

  return (
    <figure data-state="data" className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={`Line chart: ${series.map((entry) => entry.label).join(", ")}`}
        className="w-full"
      >
        {/* Axis hairlines (austere, never decorative). */}
        <line
          x1="0"
          y1={plotHeight}
          x2={WIDTH}
          y2={plotHeight}
          strokeWidth="1"
          className="stroke-border"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2={plotHeight}
          strokeWidth="1"
          className="stroke-border"
        />
        {/* Series draw in 400ms after the axis (MI-12). */}
        {series.map((entry) => (
          <polyline
            key={entry.id}
            data-testid={`chart-line-${entry.id}`}
            points={toPoints(entry.points)}
            fill="none"
            strokeWidth="1.5"
            pathLength={1}
            strokeDasharray="1"
            className={cn(
              COLOR_STROKE[entry.color],
              "animate-draw-in motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]",
            )}
          />
        ))}
        {xLabels.map((tick, index) => (
          <text
            key={tick}
            x={(index * WIDTH) / Math.max(1, xLabels.length - 1)}
            y={height - 6}
            textAnchor={
              index === 0
                ? "start"
                : index === xLabels.length - 1
                  ? "end"
                  : "middle"
            }
            className="fill-text-2 text-[10px] tabular-nums"
          >
            {tick}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-3">
        {series.map((entry) => (
          <span
            key={entry.id}
            className="inline-flex items-center gap-1.5 text-[11px] text-text-2"
          >
            <span
              aria-hidden
              className={cn("h-0.5 w-4 rounded-full", COLOR_BG[entry.color])}
            />
            {entry.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
};

export default ChartLine;
