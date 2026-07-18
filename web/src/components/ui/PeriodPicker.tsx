"use client";

/**
 * DatePicker/PeriodPicker — design.md §8.2b: modes day / range / month /
 * quarter / year (the closed period grammar, line-items.md §6) ·
 * open/closed · error · presets.
 */

import React, { useEffect, useRef, useState } from "react";
import { Calendar, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";

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
  const rootRef = useRef<HTMLDivElement>(null);

  // Track the controlled value — adjust-state-during-render, no effect.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value ?? "");
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
    onValueChange?.(next);
    setOpen(false);
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
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-invalid={shownError ? true : undefined}
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded border bg-bg px-3 text-left text-sm",
          "transition-colors duration-fast ease-standard",
          shownError ? "border-expense" : "border-border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:bg-bg-elev disabled:opacity-60",
        )}
      >
        <span className="flex items-center gap-2">
          <Calendar aria-hidden className="h-4 w-4 text-text-2" />
          <span
            className={cn("tabular-nums", value ? "text-text" : "text-text-2")}
          >
            {value ?? MODE_PLACEHOLDER[mode]}
          </span>
        </span>
        <ChevronsUpDown aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`Pick ${mode}`}
          className="absolute left-0 top-full z-dropdown mt-1 w-full min-w-56 rounded border border-border bg-bg p-3 shadow-lg"
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
          <label className="block text-[11px] font-medium uppercase tracking-wide text-text-2">
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
