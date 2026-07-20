"use client";

/**
 * Chart/Donut — design.md §8.2b: state loading / data / empty · legend
 * right / bottom / none (none pairs with loading/empty) · center total.
 * Bespoke SVG per the reuse policy; slices take the registry category
 * colors (B8 ColorSwatchPicker presets) — slice hex arrives as data,
 * like the CategoryChip dot.
 */

import React from "react";
import { cn } from "@/lib/cn";
import Skeleton from "./Skeleton";
import EmptyState, { type EmptyStateKind } from "./EmptyState";

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  /** Registry category color (data, not styling — B8). */
  color: string;
}

export interface ChartDonutProps {
  state?: "loading" | "data" | "empty";
  slices?: DonutSlice[];
  /** Center total text (e.g. formatted money). */
  centerTotal?: string;
  centerCaption?: string;
  legend?: "right" | "bottom" | "none";
  emptyKind?: EmptyStateKind;
  onEmptyAction?: () => void;
  className?: string;
}

const R = 40;
const CIRCUMFERENCE = 2 * Math.PI * R;

export const ChartDonut: React.FC<ChartDonutProps> = ({
  state = "data",
  slices = [],
  centerTotal,
  centerCaption,
  legend = "right",
  emptyKind = "transactions",
  onEmptyAction,
  className,
}) => {
  if (state === "loading") {
    return <Skeleton variant="chart" className={className} />;
  }
  if (state === "empty" || slices.length === 0) {
    return (
      <EmptyState
        kind={emptyKind}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const dashes = slices.map((slice) => (slice.value / total) * CIRCUMFERENCE);
  const offsets = dashes.map((_, index) =>
    dashes.slice(0, index).reduce((sum, dash) => sum + dash, 0),
  );

  return (
    <figure
      data-state="data"
      data-legend={legend}
      className={cn(
        "flex items-center gap-4",
        legend === "bottom" && "flex-col",
        className,
      )}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Donut chart: ${slices.map((slice) => slice.label).join(", ")}`}
      >
        <g transform="rotate(-90 60 60)">
          {slices.map((slice, index) => (
            <circle
              key={slice.id}
              data-testid={`donut-slice-${slice.id}`}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              strokeWidth="14"
              stroke={slice.color}
              strokeDasharray={`${dashes[index]} ${CIRCUMFERENCE - dashes[index]}`}
              strokeDashoffset={-offsets[index]}
            />
          ))}
        </g>
        {centerTotal ? (
          // Center label (Figma master 126:1183): caption ON TOP (13px,
          // text-2), compact value below (20px semibold) — callers pass
          // compact-notation totals (₦3.61M, never full precision).
          <>
            {centerCaption ? (
              <text
                x="60"
                y="54"
                textAnchor="middle"
                className="fill-text-2 text-[13px]"
              >
                {centerCaption}
              </text>
            ) : null}
            <text
              x="60"
              y={centerCaption ? 74 : 66}
              textAnchor="middle"
              className="fill-text text-[20px] font-semibold tabular-nums"
            >
              {centerTotal}
            </text>
          </>
        ) : null}
      </svg>
      {legend !== "none" ? (
        <figcaption
          className={cn(
            "flex gap-x-3 gap-y-1 text-[11px] text-text-2",
            legend === "right"
              ? "flex-col"
              : "flex-row flex-wrap justify-center",
          )}
        >
          {slices.map((slice) => (
            <span key={slice.id} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
};

export default ChartDonut;
