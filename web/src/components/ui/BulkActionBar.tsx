"use client";

/**
 * BulkActionBar — design.md §8.2b: hidden / visible ("n selected" +
 * re-categorize / export / clear) · slide-in.
 */

import React from "react";
import { Download, Tag as TagIcon, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface BulkActionBarProps {
  selectedCount: number;
  onRecategorize?: () => void;
  onExport?: () => void;
  onClear?: () => void;
  className?: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onRecategorize,
  onExport,
  onClear,
  className,
}) => {
  if (selectedCount <= 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className={cn(
        "flex items-center gap-3 rounded border border-border bg-bg px-3 py-2 shadow-lg",
        "animate-slide-in-up motion-reduce:animate-none",
        className,
      )}
    >
      <span className="text-[13px] font-medium tabular-nums text-text">
        {selectedCount} selected
      </span>
      <span aria-hidden className="h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onRecategorize}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[13px] font-medium text-text transition-colors duration-fast ease-standard hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <TagIcon aria-hidden className="h-3.5 w-3.5" />
        Re-categorize
      </button>
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[13px] font-medium text-text transition-colors duration-fast ease-standard hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Download aria-hidden className="h-3.5 w-3.5" />
        Export
      </button>
      <button
        type="button"
        aria-label="Clear selection"
        onClick={onClear}
        className="ml-auto rounded p-1 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default BulkActionBar;
