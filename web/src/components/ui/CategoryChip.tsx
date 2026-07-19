"use client";

/**
 * CategoryChip — design.md §3/§8.2: color-dot + label; AI-assigned carry
 * a ✨ until confirmed; editing opens an in-cell combobox (MI-4) that is
 * absolutely positioned so the open menu never inflates the row (QA loop
 * 2026-07-18); menu carries registry categories only.
 */

import React, { useEffect, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useViewportShiftX } from "@/lib/use-viewport-clamp";

export interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

export interface CategoryChipProps {
  category: CategoryOption;
  /** AI-suggested, not yet human-confirmed (✨). */
  aiSuggested?: boolean;
  /** Registry categories — the only combobox contents. */
  options?: CategoryOption[];
  /** MI-4: commit clears the ✨; 80ms chip color crossfade at the call site. */
  onSelect?: (categoryId: string) => void;
  disabled?: boolean;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  aiSuggested = false,
  options = [],
  onSelect,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The 180px menu is left-anchored to a chip that can sit near the
  // right viewport edge in narrow ledgers — clamp keeps it fully in the
  // viewport (floating-layer sweep 2026-07-19).
  const shiftX = useViewportShiftX(open, menuRef);
  const editable = !disabled && options.length > 0 && !!onSelect;

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

  const filtered = options.filter((option) =>
    option.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <span ref={rootRef} className="relative inline-flex">
      {open ? (
        // Figma editing state: the chip itself becomes the combobox input
        // (28px, 2px accent border) with the menu anchored below.
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="category-chip-listbox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={category.name}
          className={cn(
            "h-7 w-[180px] rounded border-2 border-accent bg-bg px-2",
            "text-[13px] font-medium leading-4 text-text placeholder:text-text-2",
            "focus:outline-none",
          )}
        />
      ) : (
        <button
          type="button"
          disabled={!editable}
          aria-expanded={open}
          aria-haspopup={editable ? "listbox" : undefined}
          onClick={() => editable && setOpen(true)}
          className={cn(
            // Figma chip: bg-elev pill, hairline border, Table/13 Medium.
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elev",
            "px-2 py-[3px] text-[13px] font-medium leading-4 text-text",
            "transition-colors duration-fast ease-standard",
            editable && "hover:border-text-2 cursor-pointer",
            !editable && "cursor-default",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
          )}
        >
          <span
            aria-hidden
            data-testid="category-dot"
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span>{category.name}</span>
          {aiSuggested ? (
            <Sparkles
              data-testid="category-ai-mark"
              aria-label="AI-suggested"
              className="h-3 w-3 text-info"
            />
          ) : null}
        </button>
      )}

      {open ? (
        // Absolutely positioned: the open combobox never shifts row layout.
        <div
          ref={menuRef}
          style={shiftX ? { transform: `translateX(${shiftX}px)` } : undefined}
          className="absolute left-0 top-8 z-dropdown w-[180px] rounded border border-border bg-bg py-1 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.12)]"
        >
          <ul
            id="category-chip-listbox"
            role="listbox"
            className="max-h-56 overflow-auto"
          >
            {filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === category.id}
                  onClick={() => {
                    onSelect?.(option.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[13px] leading-4 text-text",
                    "hover:bg-bg-elev transition-colors duration-fast ease-standard",
                    option.id === category.id && "bg-bg-elev",
                  )}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  {option.id === category.id ? (
                    <Check aria-hidden className="h-3 w-3 text-accent" />
                  ) : null}
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-2 py-1.5 text-[13px] text-text-2">
                No matching category
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </span>
  );
};

export default CategoryChip;
