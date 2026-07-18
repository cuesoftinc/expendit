"use client";

/**
 * RatioGauge — design.md §3/§8.2 (MI-8): bespoke SVG semicircle gauge +
 * value + benchmark band. Status healthy / warning / critical / n-a
 * ("missing input" — band off, per the as-built note). Needle eases to
 * value 600ms cubic, benchmark band fades in after; hover/focus shows the
 * formula tooltip; reduced motion jump-cuts (design.md §5).
 */

import React, { useEffect, useState } from "react";
import type { RatioStatus } from "@/models";
import { cn } from "@/lib/cn";
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
  /** MI-8 formula tooltip content. */
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

const STATUS_TEXT: Record<RatioStatus, string> = {
  healthy: "text-income",
  warning: "text-warn",
  critical: "text-expense",
  na: "text-text-2",
};

const CX = 80;
const CY = 72;
const R = 60;

/** Angle in degrees for a domain fraction: 180° (left) → 0° (right). */
const arcPoint = (fraction: number, radius = R): [number, number] => {
  const angle = Math.PI * (1 - fraction);
  return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)];
};

const arcPath = (fromFraction: number, toFraction: number): string => {
  const [x1, y1] = arcPoint(fromFraction);
  const [x2, y2] = arcPoint(toFraction);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
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
  formula,
  naReason = null,
  className,
}) => {
  const reduced = useReducedMotion();
  const isNa = status === "na" || value === null;
  const targetFraction = isNa
    ? 0
    : clamp01((Number(value) - min) / (max - min || 1));

  // MI-8: needle starts at rest and eases to the value (600ms cubic);
  // reduced motion jump-cuts straight to the target.
  const [needleFraction, setNeedleFraction] = useState(
    reduced ? targetFraction : 0,
  );
  useEffect(() => {
    // One frame later in both modes; the reduced-motion jump-cut comes
    // from motion-reduce:transition-none on the needle/arc.
    const frame = requestAnimationFrame(() =>
      setNeedleFraction(targetFraction),
    );
    return () => cancelAnimationFrame(frame);
  }, [targetFraction]);

  const needleAngle = -90 + needleFraction * 180;

  const gauge = (
    <figure
      data-status={status}
      className={cn(
        "inline-flex flex-col items-center rounded border border-border bg-bg-elev p-4",
        className,
      )}
    >
      <svg
        width="160"
        height="88"
        viewBox="0 0 160 88"
        role="img"
        aria-label={`${label}: ${isNa ? (naReason ?? "n/a — missing input") : (display ?? String(value))}`}
      >
        {/* Track */}
        <path
          d={arcPath(0, 1)}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-border"
        />
        {/* Benchmark band — fades in after the needle settles (MI-8). */}
        {band && !isNa ? (
          <path
            data-testid="gauge-band"
            d={arcPath(
              clamp01((band.from - min) / (max - min || 1)),
              clamp01((band.to - min) / (max - min || 1)),
            )}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn(
              "stroke-income/40",
              !reduced &&
                "animate-fade-in [animation-delay:600ms] motion-reduce:animate-none",
            )}
          />
        ) : null}
        {/* Value arc */}
        {!isNa ? (
          <path
            d={arcPath(0, Math.max(0.001, needleFraction))}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn(
              STATUS_STROKE[status],
              "transition-all duration-[600ms] ease-standard motion-reduce:transition-none",
            )}
          />
        ) : null}
        {/* Needle */}
        <g
          data-testid="gauge-needle"
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
          }}
          className={cn(
            "transition-transform duration-[600ms] ease-standard",
            "motion-reduce:transition-none",
          )}
        >
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - R + 14}
            strokeWidth="2"
            className={isNa ? "stroke-border" : "stroke-text"}
          />
        </g>
        <circle cx={CX} cy={CY} r="3.5" className="fill-text" />
      </svg>
      <figcaption className="mt-1 text-center">
        <div
          className={cn(
            "text-xl font-semibold tabular-nums",
            STATUS_TEXT[status],
          )}
        >
          {isNa ? "n/a" : (display ?? String(value))}
        </div>
        <div className="text-[13px] text-text-2">{label}</div>
        {isNa ? (
          <div className="mt-0.5 text-[11px] text-text-2">
            {naReason ?? "missing input"}
          </div>
        ) : null}
      </figcaption>
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
