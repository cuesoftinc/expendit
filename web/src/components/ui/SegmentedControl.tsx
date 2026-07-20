"use client";

/**
 * SegmentedControl — design.md §8.2b: presets density (compact/
 * comfortable) / direction (income/expense) / theme; selection is preset
 * content (as-built 2026-07-17); state default / disabled.
 */

import React from "react";
import { cn } from "@/lib/cn";

export interface SegmentOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onValueChange,
  disabled = false,
  "aria-label": ariaLabel,
}) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={cn(
      "inline-flex rounded border border-border bg-bg-elev p-0.5",
      disabled && "cursor-not-allowed opacity-60",
    )}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        disabled={disabled}
        onClick={() => onValueChange?.(option.value)}
        className={cn(
          "rounded px-2.5 py-1 text-[13px] font-medium transition-colors duration-fast ease-standard",
          option.value === value
            ? "bg-bg text-text shadow-xs"
            : "text-text-2 hover:text-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default SegmentedControl;
