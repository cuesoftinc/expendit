"use client";

/**
 * Switch/Toggle — design.md §8.2b: on/off × states · with label/helper.
 */

import React from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  helper?: string;
  disabled?: boolean;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  helper,
  disabled = false,
  id,
}) => (
  <label
    className={cn(
      "flex items-start gap-3",
      disabled && "cursor-not-allowed opacity-60",
    )}
  >
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "h-5 w-9 shrink-0 rounded-full border border-border p-0.5 transition-colors duration-base ease-standard",
        checked ? "bg-accent" : "bg-bg-elev",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          "block h-3.5 w-3.5 rounded-full bg-bg shadow transition-transform duration-base ease-standard motion-reduce:transition-none",
          checked ? "translate-x-4 bg-on-accent" : "translate-x-0",
        )}
      />
    </RadixSwitch.Root>
    {label || helper ? (
      <span className="flex flex-col text-sm text-text">
        {label ? <span className="font-medium">{label}</span> : null}
        {helper ? (
          <span className="text-[13px] text-text-2">{helper}</span>
        ) : null}
      </span>
    ) : null}
  </label>
);

export default Switch;
