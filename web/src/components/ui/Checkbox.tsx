"use client";

/**
 * Checkbox — design.md §8.2b: unchecked / checked / indeterminate ×
 * default / hover / focus / disabled · with label. Radix headless
 * semantics (reuse policy: behavior primitives only).
 */

import React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CheckboxProps {
  checked: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  id,
}) => (
  <label
    className={cn(
      "inline-flex items-center gap-2 text-sm text-text",
      disabled && "cursor-not-allowed opacity-60",
    )}
  >
    <RadixCheckbox.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded border transition-colors duration-fast ease-standard",
        checked !== false
          ? "border-accent bg-accent text-on-accent"
          : "border-border bg-bg hover:border-text-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
      )}
    >
      <RadixCheckbox.Indicator>
        {checked === "indeterminate" ? (
          <Minus className="h-3 w-3" aria-hidden />
        ) : (
          <Check className="h-3 w-3" aria-hidden />
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
    {label ? <span>{label}</span> : null}
  </label>
);

export default Checkbox;
