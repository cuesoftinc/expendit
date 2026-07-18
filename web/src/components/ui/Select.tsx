"use client";

/**
 * Select/Menu — design.md §8.2b: trigger default / focus / open /
 * disabled / error · option default / hover / selected · md/sm ·
 * searchable-combobox variant (MI-4 canonical-key mapping; combobox is
 * md-only as built). Custom listbox semantics (reuse policy: headless
 * behavior only — no styled kits).
 */

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional mono rendering (canonical keys). */
  mono?: boolean;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value: string | null;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "md" | "sm";
  /** Searchable combobox variant (md-only as built). */
  searchable?: boolean;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  size = "md",
  searchable = false,
  disabled = false,
  error = null,
  label,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Reset the active row/search when the menu opens or closes — the
  // React "adjust state during render" pattern (no effect involved).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setActiveIndex(
        Math.max(
          0,
          filtered.findIndex((option) => option.value === value),
        ),
      );
    } else {
      setQuery("");
    }
  }

  const commit = (option: SelectOption) => {
    if (option.disabled) return;
    onValueChange?.(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (event.key === "Enter" || event.key === "ArrowDown")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) commit(option);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      {label ? (
        <span className="mb-1 block text-[13px] font-medium text-text-2">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded border bg-bg text-left",
          "transition-colors duration-fast ease-standard",
          // Figma: md = 36px, sm = 28px.
          size === "md" ? "h-9 px-3 text-sm" : "h-7 px-2.5 text-[13px]",
          error ? "border-expense" : "border-border",
          // Figma open/focus trigger: accent border.
          open && "border-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          // Figma disabled: whole control at 40%.
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <span
          className={cn(
            selected ? "text-text" : "text-text-2",
            selected?.mono && "font-mono text-[13px]",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-dropdown mt-1 w-full rounded border border-border bg-bg shadow-lg">
          {searchable ? (
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search aria-hidden className="h-3.5 w-3.5 text-text-2" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search"
                className="w-full bg-transparent py-2 text-[13px] text-text placeholder:text-text-2 focus:outline-none"
              />
            </div>
          ) : null}
          <ul
            id={listboxId}
            role="listbox"
            className="max-h-56 overflow-auto py-1"
          >
            {filtered.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(option)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] text-text",
                    "transition-colors duration-fast ease-standard",
                    index === activeIndex && "bg-bg-elev",
                    option.disabled && "cursor-not-allowed opacity-60",
                    option.mono && "font-mono",
                  )}
                >
                  <span>{option.label}</span>
                  {option.value === value ? (
                    <Check aria-hidden className="h-3.5 w-3.5 text-accent" />
                  ) : null}
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-3 py-1.5 text-[13px] text-text-2">No match</li>
            ) : null}
          </ul>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-[13px] text-expense">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default Select;
