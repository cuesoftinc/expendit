"use client";

/**
 * ColorSwatchPicker — design.md §8.2b: preset swatch grid (category
 * color, B8); swatch / hover / selected are internal states, not a
 * variant set. Swatch values come from the category registry presets —
 * arbitrary hex entry is intentionally absent.
 */

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ColorSwatchPickerProps {
  /** Registry preset colors (hex values arrive as data, not styling). */
  presets: string[];
  value: string | null;
  onValueChange?: (color: string) => void;
  "aria-label"?: string;
  className?: string;
}

export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  presets,
  value,
  onValueChange,
  "aria-label": ariaLabel = "Category color",
  className,
}) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={cn("flex flex-wrap gap-2", className)}
  >
    {presets.map((color) => {
      const selected = color === value;
      return (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={color}
          onClick={() => onValueChange?.(color)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform duration-fast ease-standard",
            "hover:scale-110 motion-reduce:hover:scale-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            selected ? "border-text" : "border-transparent",
          )}
          style={{ backgroundColor: color }}
        >
          {selected ? (
            <Check
              aria-hidden
              strokeWidth={3}
              className="h-3.5 w-3.5 text-on-accent"
            />
          ) : null}
        </button>
      );
    })}
  </div>
);

export default ColorSwatchPicker;
