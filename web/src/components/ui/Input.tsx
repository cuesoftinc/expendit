"use client";

/**
 * Input — design.md §8.2: type text / search · state default / focus /
 * filled / disabled / error.
 */

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  type?: "text" | "search";
  error?: string | null;
  label?: string;
}

export const Input: React.FC<InputProps> = ({
  type = "text",
  error = null,
  label,
  id,
  className,
  ...rest
}) => {
  const inputId = id ?? rest.name ?? undefined;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1 block text-[13px] font-medium text-text-2"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        {type === "search" ? (
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-2"
          />
        ) : null}
        <input
          id={inputId}
          type={type === "search" ? "search" : "text"}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-10 w-full rounded border bg-bg px-3 text-sm text-text",
            "placeholder:text-text-2 transition-colors duration-fast ease-standard",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:bg-bg-elev disabled:opacity-60",
            type === "search" && "pl-9",
            error ? "border-expense" : "border-border",
            className,
          )}
          {...rest}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-[13px] text-expense">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default Input;
