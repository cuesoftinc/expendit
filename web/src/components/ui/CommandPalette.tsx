"use client";

/**
 * CommandPalette — design.md §3/§8.2 (MI-1): ⌘K opens (120ms fade + 4px
 * rise); fuzzy match; ↑↓ + Enter; recent-first; actions show shortcut
 * hints. Navigation/actions/recent-records are supplied as items.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import Kbd from "./Kbd";

export interface CommandItem {
  id: string;
  label: string;
  group: "recent" | "action" | "navigate";
  /** Shortcut hint parts, e.g. ["⌘", "U"]. */
  shortcut?: string[];
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
}

/** Subsequence fuzzy match ("upst" matches "Upload statement"). */
export const fuzzyMatch = (query: string, label: string): boolean => {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const l = label.toLowerCase();
  let index = 0;
  for (const char of q) {
    index = l.indexOf(char, index);
    if (index === -1) return false;
    index += 1;
  }
  return true;
};

const GROUP_ORDER: Record<CommandItem["group"], number> = {
  recent: 0,
  action: 1,
  navigate: 2,
};

const GROUP_LABEL: Record<CommandItem["group"], string> = {
  recent: "Recent",
  action: "Actions",
  navigate: "Navigate",
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  items,
  placeholder = "Search or run a command…",
}) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  // Focus restore (2026-07-21 a11y audit, fleet P4): the palette opens
  // programmatically (⌘K), so closing must hand focus back to whatever
  // element had it before the palette autofocused its input — Escape
  // previously dropped focus on <body>.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // MI-1: global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
      if (event.key === "Escape" && open) onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Reset on close — adjust-state-during-render, not an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  // Opening snapshots the opener, then moves focus into the search input
  // (the input carries no autoFocus so document.activeElement is still the
  // trigger when this runs); closing sends focus back to the opener after
  // the palette's DOM is gone.
  useEffect(() => {
    if (open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      inputRef.current?.focus();
    } else {
      const opener = returnFocusRef.current;
      returnFocusRef.current = null;
      if (opener?.isConnected) opener.focus();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const matched = query
      ? items.filter((item) => fuzzyMatch(query, item.label))
      : items;
    // Recent-first, stable within groups.
    return [...matched].sort(
      (a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group],
    );
  }, [items, query]);

  if (!open) return null;

  const commit = (item: CommandItem) => {
    item.onSelect();
    onOpenChange(false);
  };

  const onInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) commit(item);
    }
  };

  return (
    <>
      <div
        data-testid="palette-overlay"
        aria-hidden
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 z-overlay bg-bg-editorial/40 animate-fade-in motion-reduce:animate-none"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={cn(
          "fixed left-1/2 top-24 z-modal w-[calc(100%-32px)] max-w-xl -translate-x-1/2",
          "rounded border border-border bg-bg shadow-lg",
          "animate-rise-in motion-reduce:animate-none",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search aria-hidden className="h-4 w-4 text-text-2" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent py-3 text-sm text-text placeholder:text-text-2 focus:outline-none"
          />
          <Kbd keys={["esc"]} />
        </div>
        <ul
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          className="max-h-80 overflow-auto py-1"
        >
          {filtered.map((item, index) => {
            const showGroup =
              index === 0 || filtered[index - 1].group !== item.group;
            return (
              <React.Fragment key={item.id}>
                {showGroup ? (
                  <li
                    aria-hidden
                    className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-text-2"
                  >
                    {GROUP_LABEL[item.group]}
                  </li>
                ) : null}
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(item)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text",
                      "transition-colors duration-fast ease-standard",
                      index === activeIndex && "bg-bg-elev",
                    )}
                  >
                    <span>{item.label}</span>
                    {item.shortcut ? <Kbd keys={item.shortcut} /> : null}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-text-2">No results</li>
          ) : null}
        </ul>
      </div>
    </>
  );
};

export default CommandPalette;
