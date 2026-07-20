"use client";

/**
 * DatePicker / MonthPicker — design.md §8.2b: the period-grammar grids
 * the PeriodPicker popover embeds so every dashboard date field is
 * pick-or-type (typing stays the a11y path; the popover chrome —
 * outside-click, Escape, viewport clamp — lives on PeriodPicker).
 * Bespoke per the reuse policy (headless behavior only — no styled
 * kits); date-fns for the math; construction parity with apparule's
 * DateInput calendar. QuarterPicker/YearPicker extend the same
 * anatomy to the closed period grammar's other modes (line-items.md §6).
 *
 * Geometry is the Figma DatePicker master (set 467:11039): 194px grid
 * content; day cells 26×22 (gap 2px across / 4px between weeks,
 * weekday header S M T W T F S at 13 Medium text-2); month/quarter
 * cells 26px tall on a 4px gap; nav rows carry 14px chevrons around a
 * centered 13 Medium label; 4px row rhythm.
 */

import React, { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/cn";

/** Sunday-first weeks — the Figma DatePicker master's grid geometry. */
const WEEK_STARTS_ON = 0;

/** Single-letter weekday header per the master (S M T W T F S). */
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Pure grid math: every day the month grid shows — full Sunday-first
 * weeks from the Sunday on/before the 1st through the Saturday
 * on/after month end.
 */
export const calendarDays = (month: Date): Date[] =>
  eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
  });

/** Shared header chrome: chevron nav around a tabular label. */
const GridHeader: React.FC<{
  label: string;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
}> = ({ label, prevLabel, nextLabel, onPrev, onNext }) => (
  // Master nav row: 14px chevrons at the row edges, 13 Medium label
  // centered; 4px gap to the grid below.
  <div className="mb-1 flex w-full items-center justify-between">
    <button
      type="button"
      aria-label={prevLabel}
      onClick={onPrev}
      className={cn(
        "grid size-6 place-items-center rounded text-text-2",
        "transition-colors duration-fast ease-standard hover:bg-bg-elev hover:text-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      )}
    >
      <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
    </button>
    <span
      aria-live="polite"
      className="text-[13px] font-medium tabular-nums text-text"
    >
      {label}
    </span>
    <button
      type="button"
      aria-label={nextLabel}
      onClick={onNext}
      className={cn(
        "grid size-6 place-items-center rounded text-text-2",
        "transition-colors duration-fast ease-standard hover:bg-bg-elev hover:text-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      )}
    >
      <ChevronRight aria-hidden className="h-3.5 w-3.5" />
    </button>
  </div>
);

export interface DatePickerProps {
  /** Selected day (the range start when rangeEnd is set). */
  value: Date | null;
  /** Range end — days between value and rangeEnd render in-range. */
  rangeEnd?: Date | null;
  onSelect: (day: Date) => void;
  /** Earliest selectable day (inclusive). */
  minDate?: Date;
  /** Latest selectable day (inclusive). */
  maxDate?: Date;
  className?: string;
}

/**
 * Month-grid calendar: weekday header, month chevron nav, today +
 * selected states, roving arrow-key focus (crossing a month edge flips
 * the grid).
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  rangeEnd = null,
  onSelect,
  minDate,
  maxDate,
  className,
}) => {
  const [month, setMonth] = useState(() => startOfMonth(value ?? new Date()));
  const [focusDay, setFocusDay] = useState<Date | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Typed-input sync: when the controlled value moves to another month
  // (a valid date was typed), snap the visible grid to it —
  // adjust-state-during-render, no effect.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue?.getTime() !== value?.getTime()) {
    setPrevValue(value);
    if (value && !isSameMonth(value, month)) setMonth(startOfMonth(value));
  }

  // Roving focus follows arrow-key moves after the grid re-renders.
  useLayoutEffect(() => {
    if (!focusDay) return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-day="${format(focusDay, "yyyy-MM-dd")}"]`,
      )
      ?.focus();
  }, [focusDay, month]);

  const days = calendarDays(month);
  const min = minDate ? startOfDay(minDate) : undefined;
  const max = maxDate ? startOfDay(maxDate) : undefined;
  const isDisabled = (day: Date) =>
    (min !== undefined && isBefore(day, min)) ||
    (max !== undefined && isAfter(day, max));
  const from = value;
  const to = rangeEnd;
  const inRange = (day: Date) =>
    from !== null &&
    to !== null &&
    isAfter(day, startOfDay(from)) &&
    isBefore(day, startOfDay(to));
  // One tab stop: the focused/selected day (today, else the 1st).
  const tabStop =
    focusDay ??
    (value && isSameMonth(value, month) ? value : null) ??
    (isSameMonth(new Date(), month) ? startOfDay(new Date()) : month);

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const delta = deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const current =
      (event.target instanceof HTMLElement && event.target.dataset.day
        ? new Date(`${event.target.dataset.day}T00:00:00`)
        : null) ?? tabStop;
    const next = addDays(current, delta);
    if (!isSameMonth(next, month)) setMonth(startOfMonth(next));
    setFocusDay(next);
  };

  return (
    <div className={cn("select-none", className)} data-testid="date-picker">
      <GridHeader
        label={format(month, "MMMM yyyy")}
        prevLabel="Previous month"
        nextLabel="Next month"
        onPrev={() => setMonth((current) => addMonths(current, -1))}
        onNext={() => setMonth((current) => addMonths(current, 1))}
      />
      <div
        ref={gridRef}
        role="grid"
        aria-label={format(month, "MMMM yyyy")}
        onKeyDown={onGridKeyDown}
        // Master day grid: 26px columns, 2px column gap, 4px week gap
        // (7×26 + 6×2 = the 194px content width).
        className="grid w-[194px] grid-cols-7 gap-x-0.5 gap-y-1 text-center"
      >
        {WEEKDAYS.map((weekday, index) => (
          <span
            key={index}
            aria-hidden
            className="flex h-[22px] w-[26px] items-center justify-center text-[13px] font-medium text-text-2"
          >
            {weekday}
          </span>
        ))}
        {days.map((day) => {
          const outside = !isSameMonth(day, month);
          const disabled = isDisabled(day);
          const selected =
            (value !== null && isSameDay(day, value)) ||
            (rangeEnd !== null && isSameDay(day, rangeEnd));
          return (
            <button
              key={day.toISOString()}
              type="button"
              data-day={format(day, "yyyy-MM-dd")}
              disabled={disabled}
              tabIndex={isSameDay(day, tabStop) ? 0 : -1}
              onClick={() => onSelect(day)}
              aria-label={format(day, "d MMMM yyyy")}
              aria-pressed={selected || undefined}
              aria-current={isToday(day) ? "date" : undefined}
              className={cn(
                // Master day cell: 26×22, 4px radius, Table/13.
                "grid h-[22px] w-[26px] place-items-center rounded text-[13px] tabular-nums",
                "transition-colors duration-fast ease-standard",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "bg-accent font-medium text-on-accent"
                  : inRange(day)
                    ? "bg-accent/15 text-text"
                    : isToday(day)
                      ? // Master's today state: accent-outlined cell, Medium.
                        "font-medium text-text ring-1 ring-inset ring-accent hover:bg-bg-elev"
                      : "text-text hover:bg-bg-elev",
                outside && !selected && "text-text-2",
                disabled &&
                  "cursor-not-allowed text-text-2/40 hover:bg-transparent",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface MonthPickerProps {
  /** Any day inside the selected month. */
  value: Date | null;
  onSelect: (monthStart: Date) => void;
  className?: string;
}

/** MonthPicker variant: year chevron nav over a 12-month grid. */
export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onSelect,
  className,
}) => {
  const [year, setYear] = useState(() => (value ?? new Date()).getFullYear());

  // Typed-input sync — adjust-state-during-render, no effect.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue?.getTime() !== value?.getTime()) {
    setPrevValue(value);
    if (value) setYear(value.getFullYear());
  }

  return (
    <div className={cn("select-none", className)} data-testid="month-picker">
      <GridHeader
        label={String(year)}
        prevLabel="Previous year"
        nextLabel="Next year"
        onPrev={() => setYear((current) => current - 1)}
        onNext={() => setYear((current) => current + 1)}
      />
      {/* Master month grid: 62×26 cells on a 4px gap (194px content). */}
      <div className="grid w-[194px] grid-cols-3 gap-1">
        {Array.from({ length: 12 }, (_, index) => {
          const monthStart = new Date(year, index, 1);
          const selected = value !== null && isSameMonth(monthStart, value);
          const current = isSameMonth(monthStart, new Date());
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(monthStart)}
              aria-label={format(monthStart, "MMMM yyyy")}
              aria-pressed={selected || undefined}
              aria-current={current ? "date" : undefined}
              className={cn(
                "h-[26px] rounded text-[13px] transition-colors duration-fast ease-standard",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "bg-accent font-medium text-on-accent"
                  : current
                    ? "text-text ring-1 ring-inset ring-accent hover:bg-bg-elev"
                    : "text-text hover:bg-bg-elev",
              )}
            >
              {format(monthStart, "MMM")}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface QuarterPickerProps {
  value: { year: number; quarter: number } | null;
  onSelect: (next: { year: number; quarter: number }) => void;
  className?: string;
}

/** Quarter variant of the MonthPicker anatomy: year nav + Q1–Q4. */
export const QuarterPicker: React.FC<QuarterPickerProps> = ({
  value,
  onSelect,
  className,
}) => {
  const [year, setYear] = useState(
    () => value?.year ?? new Date().getFullYear(),
  );

  // Typed-input sync — adjust-state-during-render, no effect.
  const [prevValue, setPrevValue] = useState(value);
  if (
    prevValue?.year !== value?.year ||
    prevValue?.quarter !== value?.quarter
  ) {
    setPrevValue(value);
    if (value) setYear(value.year);
  }

  const now = new Date();
  const currentQuarter = {
    year: now.getFullYear(),
    quarter: Math.floor(now.getMonth() / 3) + 1,
  };

  return (
    <div className={cn("select-none", className)} data-testid="quarter-picker">
      <GridHeader
        label={String(year)}
        prevLabel="Previous year"
        nextLabel="Next year"
        onPrev={() => setYear((current) => current - 1)}
        onNext={() => setYear((current) => current + 1)}
      />
      {/* Master quarter row: Q1–Q4 as one 26px row on a 4px gap. */}
      <div className="grid w-[194px] grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((quarter) => {
          const selected =
            value !== null && value.year === year && value.quarter === quarter;
          const current =
            currentQuarter.year === year && currentQuarter.quarter === quarter;
          return (
            <button
              key={quarter}
              type="button"
              onClick={() => onSelect({ year, quarter })}
              aria-label={`Q${quarter} ${year}`}
              aria-pressed={selected || undefined}
              aria-current={current ? "date" : undefined}
              className={cn(
                "h-[26px] rounded text-[13px] tabular-nums transition-colors duration-fast ease-standard",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "bg-accent font-medium text-on-accent"
                  : current
                    ? "text-text ring-1 ring-inset ring-accent hover:bg-bg-elev"
                    : "text-text hover:bg-bg-elev",
              )}
            >
              Q{quarter}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface YearPickerProps {
  value: number | null;
  onSelect: (year: number) => void;
  /** Label mapping — the FY#### statement grammar on PeriodPicker. */
  formatLabel?: (year: number) => string;
  /** Newest year listed (default: current year). */
  from?: number;
  /** How many years the list walks back (default 10). */
  count?: number;
  className?: string;
}

/** Year list, newest first — a selected value outside the window joins it. */
export const YearPicker: React.FC<YearPickerProps> = ({
  value,
  onSelect,
  formatLabel = String,
  from = new Date().getFullYear(),
  count = 10,
  className,
}) => {
  const years = Array.from({ length: count }, (_, index) => from - index);
  if (value !== null && !years.includes(value)) {
    years.push(value);
    years.sort((a, b) => b - a);
  }
  const currentYear = new Date().getFullYear();

  return (
    // Master year list: 26px rows, no nav — the list scrolls (~5 rows).
    <ul
      data-testid="year-picker"
      className={cn(
        "max-h-[132px] w-[194px] select-none overflow-auto",
        className,
      )}
    >
      {years.map((year) => (
        <li key={year}>
          <button
            type="button"
            onClick={() => onSelect(year)}
            aria-pressed={year === value || undefined}
            aria-current={year === currentYear ? "date" : undefined}
            className={cn(
              "flex h-[26px] w-full items-center rounded px-2 text-left text-[13px] tabular-nums",
              "transition-colors duration-fast ease-standard",
              year === value
                ? "bg-accent font-medium text-on-accent"
                : year === currentYear
                  ? "text-text ring-1 ring-inset ring-accent hover:bg-bg-elev"
                  : "text-text hover:bg-bg-elev",
            )}
          >
            {formatLabel(year)}
          </button>
        </li>
      ))}
    </ul>
  );
};
