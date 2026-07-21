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
import { useAnchoredPanelPlacement } from "@/lib/use-viewport-clamp";
import Button from "./Button";
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
  const inputRef = useRef<HTMLInputElement>(null);
  // Master collision contract (467:11039): flip above when room below
  // runs out (never cover the field), cap + scroll when neither side
  // fits, keep right-anchored triggers right-anchored (the Overview
  // header trigger sat flush against the viewport edge), clamp X.
  const placement = useAnchoredPanelPlacement(open, triggerRef, panelRef);

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

  // Focus moves INTO the panel on open (org overlay contract — dialog
  // canon: focus in, contain Tab, Escape restores). The grammar input is
  // the first stop (the typing path). A plain autoFocus can't do this:
  // the panel mounts visibility:hidden for the placement measure and
  // focus() on a hidden element is a no-op — so focus lands once the
  // placement paints. The contains() guard keeps resize re-measures from
  // re-stealing focus the user has since moved within the panel.
  useEffect(() => {
    if (!open || placement === null) return;
    if (panelRef.current?.contains(document.activeElement)) return;
    inputRef.current?.focus();
  }, [open, placement]);

  /**
   * Tab containment (org overlay contract): while open, the popover is a
   * focus boundary — Tab from the last control wraps to the first and
   * Shift+Tab mirrors it, never walking out into the page behind (a11y
   * audit: 6 of 14 tabs escaped the open panel). The roving day grid
   * keeps its single tab stop via the tabIndex filter.
   */
  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [tabindex]",
      ),
    ).filter((el) => el.tabIndex >= 0);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (active === last || !panel.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  };

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
          onKeyDown={onPanelKeyDown}
          style={{
            // Cap + internal scroll when neither side fits the panel —
            // it must never exceed the viewport or grow the document.
            ...(placement?.maxHeight !== undefined
              ? { maxHeight: placement.maxHeight, overflowY: "auto" as const }
              : {}),
            ...(placement?.shiftX
              ? { transform: `translateX(${placement.shiftX}px)` }
              : {}),
            // Hide the unplaced first frame (measure paints next).
            ...(placement === null ? { visibility: "hidden" as const } : {}),
          }}
          className={cn(
            // Master popover chrome (467:10998): 194px content behind
            // 12px/10px padding — the panel hugs the grid, it does not
            // stretch to the trigger.
            "absolute z-dropdown w-[220px] rounded border border-border bg-bg px-3 py-2.5 shadow-lg",
            placement?.side === "above" ? "bottom-full mb-1" : "top-full mt-1",
            placement?.alignRight ? "right-0" : "left-0",
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
                    preset.value === value && "border-accent text-accent-text",
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
          {/* Grammar input — the typing path keeps clear air around its
              divider (it sat jammed against the grid; user report). */}
          <label className="mt-2.5 block border-t border-border pt-2 text-[11px] font-medium uppercase tracking-wide text-text-2">
            {mode}
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  // Commit refocuses the trigger — without preventDefault
                  // the browser's Enter activation then clicks the newly
                  // focused trigger and instantly reopens the popover.
                  event.preventDefault();
                  commit(draft);
                }
              }}
              placeholder={MODE_PLACEHOLDER[mode]}
              className={cn(
                "mt-1.5 h-8 w-full rounded border bg-bg px-2.5 font-mono text-[13px] tabular-nums text-text",
                "placeholder:text-text-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                draftError ? "border-expense" : "border-border",
              )}
            />
          </label>
          {/* Master confirm row: quiet Cancel + primary Apply, 28px
              Buttons on an 8px gap (the shared Button sm construction). */}
          <div className="mt-2.5 flex justify-end gap-2">
            <Button
              kind="quiet"
              size="sm"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={() => commit(draft)}>
              Apply
            </Button>
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
