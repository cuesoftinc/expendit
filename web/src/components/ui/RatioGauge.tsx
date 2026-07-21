"use client";

/**
 * RatioGauge — design.md §3/§8.2 (MI-8), Figma Stage 2 (node 66:321):
 * white card · label top-left · bespoke SVG semicircle (12px track, value
 * arc in the status color, 3px benchmark band floating outside at 45%
 * income) · Display/32 value · delta line ("+0.21 vs Q1") · caption
 * (benchmark or formula). Status healthy / warning / critical / n-a
 * ("missing input" — band off, value dash). The value arc eases to its
 * value over 600ms, the band fades in after; hover/focus shows the
 * formula tooltip; reduced motion jump-cuts (design.md §5).
 */

import React, { useEffect, useState } from "react";
import type { RatioStatus } from "@/models";
import { cn } from "@/lib/cn";
import { formatRatio } from "@/lib/format";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import Tooltip from "./Tooltip";

export interface RatioGaugeProps {
  label: string;
  /** null when n/a. */
  value: number | null;
  /** Rendered value text (e.g. "1.85", "42%"). */
  display?: string;
  /** Gauge domain. */
  min?: number;
  max?: number;
  status: RatioStatus;
  /** Benchmark band in the value domain; off for status="na". */
  band?: { from: number; to: number } | null;
  /** Delta vs previous period (Figma: "+0.21 vs Q1"). */
  delta?: number;
  /**
   * Preformatted delta magnitude in the metric's own display style
   * (e.g. "3 days", "1.2%"); the sign stays the gauge's. Defaults to
   * the Figma 2dp ratio convention ("0.21").
   */
  deltaDisplay?: string;
  deltaCaption?: string;
  /** Caption line; defaults to the benchmark range when band is on. */
  caption?: string;
  /** MI-8 formula tooltip content (also the band-off caption). */
  formula?: string;
  /** n/a reason ("missing input"). */
  naReason?: string | null;
  className?: string;
}

const STATUS_STROKE: Record<RatioStatus, string> = {
  healthy: "stroke-income",
  warning: "stroke-warn",
  critical: "stroke-expense",
  na: "stroke-border",
};

// Figma gauge geometry (node 66:266): 182×100 viewBox, centre (88,88),
// track r=70 / 12px round caps, band r=81 / 3px at 45% income.
const CX = 88;
const CY = 88;
const R = 70;
const BAND_R = 81;

/** Point on the arc for a domain fraction: 180° (left) → 0° (right). */
const arcPoint = (fraction: number, radius = R): [number, number] => {
  const angle = Math.PI * (1 - fraction);
  return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)];
};

const arcPath = (
  fromFraction: number,
  toFraction: number,
  radius = R,
): string => {
  const [x1, y1] = arcPoint(fromFraction, radius);
  const [x2, y2] = arcPoint(toFraction, radius);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

const clamp01 = (fraction: number): number =>
  Math.min(1, Math.max(0, fraction));

export const RatioGauge: React.FC<RatioGaugeProps> = ({
  label,
  value,
  display,
  min = 0,
  max = 3,
  status,
  band = null,
  delta,
  deltaDisplay,
  deltaCaption,
  caption,
  formula,
  naReason = null,
  className,
}) => {
  const reduced = useReducedMotion();
  const isNa = status === "na" || value === null;
  const targetFraction = isNa
    ? 0
    : clamp01((Number(value) - min) / (max - min || 1));

  // MI-8: the value arc starts at rest and eases to the value (600ms);
  // reduced motion jump-cuts straight to the target.
  const [arcFraction, setArcFraction] = useState(reduced ? targetFraction : 0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArcFraction(targetFraction));
    return () => cancelAnimationFrame(frame);
  }, [targetFraction]);

  const deltaPositive = (delta ?? 0) >= 0;
  const captionText =
    caption ??
    (band && !isNa ? `Benchmark ${band.from}–${band.to}` : (formula ?? null));

  const gauge = (
    <figure
      data-status={status}
      className={cn(
        "inline-flex w-[240px] flex-col items-center gap-1 rounded border border-border bg-bg p-4",
        className,
      )}
    >
      <figcaption className="w-full text-left text-[13px] font-medium leading-4 text-text-2">
        {label}
      </figcaption>
      <svg
        width="182"
        height="100"
        viewBox="0 0 182 100"
        role="img"
        aria-label={`${label}: ${isNa ? (naReason ?? "n/a — missing input") : (display ?? String(value))}`}
        className="overflow-visible"
      >
        {/* Track */}
        <path
          d={arcPath(0, 1)}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className="stroke-border"
        />
        {/* Benchmark band — floats outside; fades in after the arc (MI-8). */}
        {band && !isNa ? (
          <path
            data-testid="gauge-band"
            d={arcPath(
              clamp01((band.from - min) / (max - min || 1)),
              clamp01((band.to - min) / (max - min || 1)),
              BAND_R,
            )}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className={cn(
              "stroke-income/45",
              !reduced &&
                "animate-fade-in [animation-delay:600ms] motion-reduce:animate-none",
            )}
          />
        ) : null}
        {/* Value arc — eases to the value (MI-8). */}
        {!isNa ? (
          <path
            data-testid="gauge-value-arc"
            d={arcPath(0, Math.max(0.001, arcFraction))}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className={cn(
              STATUS_STROKE[status],
              "transition-all duration-[600ms] ease-standard motion-reduce:transition-none",
            )}
          />
        ) : null}
      </svg>
      {isNa ? (
        // Figma n-a: a quiet dash in the value slot.
        <span
          aria-hidden
          className="flex h-[38px] items-center"
          data-testid="gauge-na-dash"
        >
          <span className="h-1 w-6 rounded-full bg-text-2" />
        </span>
      ) : (
        <div className="text-[32px] font-bold leading-[38px] tracking-[-0.01em] tabular-nums text-text">
          {display ?? String(value)}
        </div>
      )}
      {!isNa && delta !== undefined ? (
        <div
          data-testid="gauge-delta"
          className={cn(
            "text-[13px] font-medium leading-4 tabular-nums",
            deltaPositive ? "text-income" : "text-expense",
          )}
        >
          {deltaPositive ? "+" : "−"}
          {/* Never the raw float (a computed delta is full-precision —
              "+1.2254901960784315"); 2dp per the Figma delta line. */}
          {deltaDisplay ?? formatRatio(Math.abs(delta))}
          {deltaCaption ? ` ${deltaCaption}` : null}
        </div>
      ) : null}
      {isNa ? (
        <div className="text-[13px] leading-4 text-text-2">
          {naReason ?? "missing input"}
        </div>
      ) : captionText ? (
        <div className="text-[13px] leading-4 text-text-2">{captionText}</div>
      ) : null}
    </figure>
  );

  // MI-8: hover shows the formula tooltip.
  return formula ? (
    <Tooltip kind="formula" content={formula}>
      <button
        type="button"
        aria-label={`${label} formula`}
        className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {gauge}
      </button>
    </Tooltip>
  ) : (
    gauge
  );
};

export default RatioGauge;
