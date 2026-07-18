"use client";

/**
 * Radio — design.md §8.2b: selected / unselected × states · with
 * label+description (choice-card: unlink keep-or-purge, report format).
 */

import React from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { cn } from "@/lib/cn";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioProps {
  value: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  /** choice-card renders bordered cards with descriptions. */
  variant?: "plain" | "choice-card";
  name?: string;
}

export const Radio: React.FC<RadioProps> = ({
  value,
  onValueChange,
  options,
  variant = "plain",
  name,
}) => (
  <RadioGroup.Root
    value={value}
    onValueChange={onValueChange}
    name={name}
    className="flex flex-col gap-2"
  >
    {options.map((option) => (
      <label
        key={option.value}
        className={cn(
          "flex items-start gap-2 text-sm text-text",
          variant === "choice-card" &&
            cn(
              "rounded border p-3 transition-colors duration-fast ease-standard",
              value === option.value
                ? "border-accent bg-accent/5"
                : "border-border hover:border-text-2",
            ),
          option.disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <RadioGroup.Item
          value={option.value}
          disabled={option.disabled}
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            value === option.value ? "border-accent" : "border-border",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          )}
        >
          <RadioGroup.Indicator className="h-2 w-2 rounded-full bg-accent" />
        </RadioGroup.Item>
        <span className="flex flex-col">
          <span className="font-medium">{option.label}</span>
          {option.description ? (
            <span className="text-[13px] text-text-2">
              {option.description}
            </span>
          ) : null}
        </span>
      </label>
    ))}
  </RadioGroup.Root>
);

export default Radio;
