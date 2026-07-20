"use client";

/**
 * Chart/Line — design.md §8.2b: state loading (axis-first, MI-12) / data /
 * empty. Bespoke SVG per the reuse policy (no chart libraries); series
 * colors bind to --income/--expense/--accent (web-implementation.md §3).
 * Content kinds (12mo cash-flow / ratio + line-item trend) arrive via
 * props; the data-table toggle attaches at screen assembly.
 *
 * Axis construction (Figma Chart/Line master 125:1109): a 44px y-axis
 * label column left of the plot (Table/13 Regular, text-2, right-aligned,
 * nice-scaled ticks — ₦0/₦2M/₦4M/₦6M in the master) with a 1px --border
 * gridline across the plot at each tick (the lowest gridline is the
 * baseline — no separate axis hairlines), and 13px text-2 x labels below
 * the plot at their data positions. Tick format is per content kind
 * (`yTickFormat` instance override; ₦-compact by default). Discrete
 * observation sets (the B6b per-FY trend) opt into `pointMarkers`: a
 * circle per datum so sparse series (N=2 fiscal years) read as
 * observations, not a continuous trend.
 */

import React from "react";
import { cn } from "@/lib/cn";
import { niceScale } from "@/lib/chart-scale";
import { formatMoneyCompact } from "@/lib/format";
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
  /**
   * Data index each xLabel ticks (thinned axes, e.g. every 2nd month).
   * Without it, labels matching the point count align to data positions;
   * otherwise they spread evenly (legacy marketing/demo usage).
   */
  xLabelIndices?: number[];
  /**
   * Circle per datum — discrete observations (B6b FY trend) read as
   * points, not a continuous line; the plot insets so edge markers show.
   */
  pointMarkers?: boolean;
  /**
   * Y-axis construction (Figma master): tick labels + gridlines. On by
   * default — every product instance in the Figma shows it.
   */
  yAxis?: boolean;
  /** Tick label format — content-kind instance override (₦-compact default). */
  yTickFormat?: (value: number) => string;
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

const COLOR_FILL: Record<ChartSeriesColor, string> = {
  income: "fill-income",
  expense: "fill-expense",
  accent: "fill-accent",
};

const WIDTH = 480;
const MARKER_RADIUS = 2.5;
// Figma master: y-axis column 44px + 8px gap to the plot.
const Y_AXIS_OFFSET_CLASS = "pl-[52px]";

export const ChartLine: React.FC<ChartLineProps> = ({
  state = "data",
  series = [],
  xLabels = [],
  xLabelIndices,
  pointMarkers = false,
  yAxis = true,
  yTickFormat = (value) => formatMoneyCompact(value),
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
  const scale = yAxis ? niceScale(Math.min(...all, 0), Math.max(...all)) : null;
  const min = scale ? scale.domainMin : Math.min(...all, 0);
  const max = scale ? scale.domainMax : Math.max(...all);
  const span = max - min || 1;
  const plotHeight = height - 24;
  const pointCount = Math.max(...series.map((entry) => entry.points.length));

  // Inset the plot when markers draw so edge circles are not clipped.
  const inset = pointMarkers ? MARKER_RADIUS + 1 : 0;
  const xAt = (index: number, count: number): number =>
    inset + (index * (WIDTH - inset * 2)) / Math.max(1, count - 1);
  const yAt = (value: number): number =>
    plotHeight - 4 - ((value - min) / span) * (plotHeight - 8);

  const toPoints = (points: number[]): string =>
    points
      .map(
        (value, index) =>
          `${xAt(index, points.length).toFixed(1)},${yAt(value).toFixed(1)}`,
      )
      .join(" ");

  /** Tick x: at the labelled datum when known, else an even spread. */
  const tickX = (index: number): number => {
    const dataIndex =
      xLabelIndices?.[index] ?? (xLabels.length === pointCount ? index : null);
    return dataIndex !== null
      ? xAt(dataIndex, pointCount)
      : (index * WIDTH) / Math.max(1, xLabels.length - 1);
  };

  return (
    <figure data-state="data" className={cn("w-full", className)}>
      <div className={cn("relative w-full", yAxis && Y_AXIS_OFFSET_CLASS)}>
        {/* Y tick labels — HTML at fixed 13px (Figma Table/13 Regular),
            absolutely spanning the plot so percentage tops track the
            gridline fractions at any rendered width. Presentation only —
            the data table carries the accessible values. */}
        {scale ? (
          <div
            aria-hidden
            data-testid="chart-y-axis"
            className="absolute inset-y-0 left-0 w-11 text-[13px] leading-4 text-text-2 tabular-nums"
          >
            {scale.ticks.map((tick, index) => (
              <span
                key={tick}
                className={cn(
                  "absolute right-0 -translate-y-1/2 whitespace-nowrap",
                  // No Part C mobile frame — per the responsive canons the
                  // axis thins below sm: domain edges + the zero baseline.
                  index !== 0 &&
                    index !== scale.ticks.length - 1 &&
                    tick !== 0 &&
                    "max-sm:hidden",
                )}
                style={{ top: `${(yAt(tick) / plotHeight) * 100}%` }}
              >
                {yTickFormat(tick)}
              </span>
            ))}
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${WIDTH} ${plotHeight}`}
          role="img"
          aria-label={`Line chart: ${series.map((entry) => entry.label).join(", ")}`}
          className="w-full"
        >
          {scale ? (
            // Gridline per tick (--border); the lowest is the baseline.
            scale.ticks.map((tick) => (
              <line
                key={tick}
                data-testid="chart-gridline"
                x1="0"
                x2={WIDTH}
                y1={yAt(tick)}
                y2={yAt(tick)}
                strokeWidth="1"
                className="stroke-border"
              />
            ))
          ) : (
            // Bare variant: axis hairlines (austere, never decorative).
            <>
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
            </>
          )}
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
          {pointMarkers
            ? series.map((entry) => (
                <g
                  key={`${entry.id}-markers`}
                  data-testid={`chart-markers-${entry.id}`}
                  aria-hidden
                >
                  {entry.points.map((value, index) => (
                    <circle
                      // Positional key — datum order is the identity here.
                      key={index}
                      cx={xAt(index, entry.points.length)}
                      cy={yAt(value)}
                      r={MARKER_RADIUS}
                      className={COLOR_FILL[entry.color]}
                    />
                  ))}
                </g>
              ))
            : null}
        </svg>
      </div>
      {xLabels.length > 0 ? (
        // X labels — 13px text-2 below the plot (Figma x-axis row),
        // anchored at their data positions within the plot band.
        <div
          aria-hidden
          data-testid="chart-x-axis"
          className={cn("mt-1 w-full", yAxis && Y_AXIS_OFFSET_CLASS)}
        >
          <div className="relative h-4 text-[13px] leading-4 text-text-2">
            {xLabels.map((tick, index) => (
              <span
                key={tick}
                className={cn(
                  "absolute top-0 whitespace-nowrap",
                  index === 0
                    ? ""
                    : index === xLabels.length - 1
                      ? "-translate-x-full"
                      : "-translate-x-1/2 max-sm:hidden",
                )}
                style={{ left: `${(tickX(index) / WIDTH) * 100}%` }}
              >
                {tick}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {series.length > 1 ? (
        // Legend renders only when there is something to disambiguate —
        // a single-series legend is redundant chrome (Figma B1 has none).
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
      ) : null}
    </figure>
  );
};

export default ChartLine;
