"use client";

/**
 * DatePicker/PeriodPicker — design.md §8.2b: modes day / range / month /
 * quarter / year (the closed period grammar, line-items.md §6) ·
 * open/closed · error · presets. Every mode is pick-or-type: the panel
 * embeds the mode's grid (DatePicker calendar, MonthPicker,
 * QuarterPicker, FY YearPicker) above the grammar input — the input
 * stays editable (the a11y path) and a valid typed draft drives the
 * grid's selection and visible month/year.
 */

import React, { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { format, isBefore, isValid, parseISO } from "date-fns";
import { formatIso } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useViewportShiftXY } from "@/lib/use-viewport-clamp";
import {
  DatePicker,
  MonthPicker,
  QuarterPicker,
  YearPicker,
} from "./DatePicker";

export type PeriodMode = "day" | "range" | "month" | "quarter" | "year";

export interface PeriodPreset {
  label: string;
  value: string;
}

export interface PeriodPickerProps {
  mode: PeriodMode;
  /** Grammar-formatted value: 2026-06-01 · 2026-06-01..2026-06-30 · 2026-06 · 2026-Q2 · FY2026. */
  value: string | null;
  onValueChange?: (value: string) => void;
  presets?: PeriodPreset[];
  error?: string | null;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const MODE_PLACEHOLDER: Record<PeriodMode, string> = {
  day: "YYYY-MM-DD",
  range: "YYYY-MM-DD..YYYY-MM-DD",
  month: "YYYY-MM",
  quarter: "YYYY-Qn",
  year: "FYYYYY",
};

/**
 * Humanized unset TRIGGER copy (Figma 182:455) — the raw grammar mask
 * stays on the panel input where it teaches the format.
 */
const MODE_TRIGGER_PLACEHOLDER: Record<PeriodMode, string> = {
  day: "Pick a date",
  range: "All dates",
  month: "Pick a month",
  quarter: "Pick a quarter",
  year: "Pick a year",
};

const MODE_PATTERN: Record<PeriodMode, RegExp> = {
  day: /^\d{4}-\d{2}-\d{2}$/,
  range: /^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  quarter: /^\d{4}-Q[1-4]$/,
  year: /^FY\d{4}$/,
};

/** Grammar validation for a period string in the given mode. */
export const isValidPeriod = (mode: PeriodMode, value: string): boolean =>
  MODE_PATTERN[mode].test(value);

/** yyyy-MM-dd → Date (null when grammar- or calendar-invalid). */
const parseDay = (value: string): Date | null => {
  if (!MODE_PATTERN.day.test(value)) return null;
  const day = parseISO(value);
  return isValid(day) ? day : null;
};

/** Grid selection the current draft (or committed value) describes. */
const parseDraft = (
  mode: PeriodMode,
  draft: string,
): {
  day: Date | null;
  from: Date | null;
  to: Date | null;
  month: Date | null;
  quarter: { year: number; quarter: number } | null;
  year: number | null;
} => {
  const none = {
    day: null,
    from: null,
    to: null,
    month: null,
    quarter: null,
    year: null,
  };
  switch (mode) {
    case "day":
      return { ...none, day: parseDay(draft) };
    case "range": {
      // A lone start ("2026-06-01..") keeps the calendar anchored while
      // the second click is pending.
      const [from, to] = draft.split("..");
      return {
        ...none,
        from: from ? parseDay(from) : null,
        to: to ? parseDay(to) : null,
      };
    }
    case "month":
      return {
        ...none,
        month: MODE_PATTERN.month.test(draft) ? parseISO(`${draft}-01`) : null,
      };
    case "quarter": {
      const match = /^(\d{4})-Q([1-4])$/.exec(draft);
      return match
        ? {
            ...none,
            quarter: { year: Number(match[1]), quarter: Number(match[2]) },
          }
        : none;
    }
    case "year": {
      const match = /^FY(\d{4})$/.exec(draft);
      return match ? { ...none, year: Number(match[1]) } : none;
    }
  }
};

/**
 * Figma trigger copy is humanized ("12 Jan 2026", "1 Apr – 30 Jun 2026",
 * "Jun 2026", "Q2 2026", "FY2025") while the value keeps the period
 * grammar (line-items.md §6).
 */
export const formatPeriod = (mode: PeriodMode, value: string): string => {
  if (!isValidPeriod(mode, value)) return value;
  switch (mode) {
    case "day":
      return formatIso(value, "d MMM yyyy");
    case "range": {
      const [from, to] = value.split("..");
      return `${formatIso(from, "d MMM")} – ${formatIso(to, "d MMM yyyy")}`;
    }
    case "month":
      return formatIso(`${value}-01`, "MMM yyyy");
    case "quarter": {
      const [year, quarter] = value.split("-");
      return `${quarter} ${year}`;
    }
    case "year":
      return value;
  }
};

export const PeriodPicker: React.FC<PeriodPickerProps> = ({
  mode,
  value,
  onValueChange,
  presets = [],
  error = null,
  disabled = false,
  label,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [draftError, setDraftError] = useState<string | null>(null);
  // Range picking is two clicks — the pending start lives here until
  // the end click commits (or the panel closes).
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The panel is min-w-56+ while the trigger can be narrower (Overview
  // header w-36) — left-anchored it overflowed the right viewport edge
  // (system QA 2026-07-19); the embedded grids are tall enough to clip
  // the bottom edge on low anchors. The two-axis clamp keeps the panel
  // fully in the viewport.
  const shift = useViewportShiftXY(open, panelRef);

  // Track the controlled value — adjust-state-during-render, no effect.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value ?? "");
  }

  // Abandoned half-picked ranges reset when the panel opens or closes.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setRangeStart(null);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        // Focus management: Escape hands focus back to the trigger
        // (outside clicks leave focus where the user put it).
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const commit = (next: string) => {
    if (!isValidPeriod(mode, next)) {
      setDraftError(`Expected ${MODE_PLACEHOLDER[mode]}`);
      return;
    }
    setDraftError(null);
    setDraft(next);
    onValueChange?.(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Grid selection follows the live draft, so a valid typed value moves
  // the calendar before it is applied (picker ↔ input sync).
  const parsed = parseDraft(mode, draft);

  /** Calendar day click — commits directly (range: start, then end). */
  const pickDay = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    if (mode === "day") {
      commit(iso);
      return;
    }
    if (rangeStart === null) {
      setRangeStart(day);
      setDraft(`${iso}..`);
      setDraftError(null);
      return;
    }
    const [from, to] = isBefore(day, rangeStart)
      ? [day, rangeStart]
      : [rangeStart, day];
    commit(`${format(from, "yyyy-MM-dd")}..${format(to, "yyyy-MM-dd")}`);
  };

  const shownError = error ?? draftError;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      {label ? (
        <span className="mb-1 block text-[13px] font-medium text-text-2">
          {label}
        </span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-invalid={shownError ? true : undefined}
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
        className={cn(
          // Figma trigger: 32px, Table/13.
          "flex h-8 w-full items-center justify-between gap-2 rounded border bg-bg px-3 text-left text-[13px]",
          "transition-colors duration-fast ease-standard",
          shownError ? "border-expense" : "border-border",
          open && !shownError && "border-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Calendar aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
          {/* Single line always — the range placeholder wrapped to two
              lines inside narrow filter pills (system QA 2026-07-19). */}
          <span
            className={cn(
              "truncate whitespace-nowrap tabular-nums",
              value ? "text-text" : "text-text-2",
            )}
          >
            {value ? formatPeriod(mode, value) : MODE_TRIGGER_PLACEHOLDER[mode]}
          </span>
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Pick ${mode}`}
          style={
            shift.x || shift.y
              ? { transform: `translate(${shift.x}px, ${shift.y}px)` }
              : undefined
          }
          className={cn(
            "absolute left-0 top-full z-dropdown mt-1 w-full rounded border border-border bg-bg p-3 shadow-lg",
            // The 7-column calendar needs the wider floor (7×32px cells).
            mode === "day" || mode === "range" ? "min-w-64" : "min-w-56",
          )}
        >
          {presets.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => commit(preset.value)}
                  className={cn(
                    "rounded border border-border bg-bg-elev px-2 py-0.5 text-[13px] tabular-nums text-text",
                    "transition-colors duration-fast ease-standard hover:border-text-2",
                    preset.value === value && "border-accent text-accent",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}
          {mode === "day" ? (
            <DatePicker value={parsed.day} onSelect={pickDay} />
          ) : mode === "range" ? (
            <DatePicker
              value={rangeStart ?? parsed.from}
              rangeEnd={rangeStart ? null : parsed.to}
              onSelect={pickDay}
            />
          ) : mode === "month" ? (
            <MonthPicker
              value={parsed.month}
              onSelect={(monthStart) => commit(format(monthStart, "yyyy-MM"))}
            />
          ) : mode === "quarter" ? (
            <QuarterPicker
              value={parsed.quarter}
              onSelect={(next) => commit(`${next.year}-Q${next.quarter}`)}
            />
          ) : (
            <YearPicker
              value={parsed.year}
              formatLabel={(year) => `FY${year}`}
              onSelect={(year) => commit(`FY${year}`)}
            />
          )}
          <label className="mt-2 block border-t border-border pt-2 text-[11px] font-medium uppercase tracking-wide text-text-2">
            {mode}
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit(draft);
              }}
              placeholder={MODE_PLACEHOLDER[mode]}
              className={cn(
                "mt-1 h-9 w-full rounded border bg-bg px-2.5 font-mono text-[13px] tabular-nums text-text",
                "placeholder:text-text-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                draftError ? "border-expense" : "border-border",
              )}
            />
          </label>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => commit(draft)}
              className="rounded bg-accent px-2.5 py-1 text-[13px] font-medium text-on-accent transition-colors duration-fast ease-standard hover:opacity-90"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
      {shownError ? (
        <p role="alert" className="mt-1 text-[13px] text-expense">
          {shownError}
        </p>
      ) : null}
    </div>
  );
};

export default PeriodPicker;
