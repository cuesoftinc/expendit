"use client";

/**
 * StagedReviewHeader — design.md §8.2b (MI-3), CTA semantics per the
 * B3b frame (183:2437): counts line · secondary "Discard N duplicates"
 * (the discard decision is its own affordance) · primary "Import N"
 * (single verb — the commit discards flagged duplicates per
 * flows/import.md §2) · state reviewing / committing (cascade at the
 * table) · warnings-banner slot.
 */

import React from "react";
import { cn } from "@/lib/cn";
import Button from "./Button";

export interface StagedReviewHeaderProps {
  importCount: number;
  /** Flagged duplicates currently marked for discard. */
  duplicateCount: number;
  state?: "reviewing" | "committing";
  onCommit?: () => void;
  /** Flags every duplicate for discard (resets explicit re-includes). */
  onDiscardDuplicates?: () => void;
  /** Warnings-banner slot (partial-extraction notices). */
  warnings?: React.ReactNode;
  className?: string;
}

export const StagedReviewHeader: React.FC<StagedReviewHeaderProps> = ({
  importCount,
  duplicateCount,
  state = "reviewing",
  onCommit,
  onDiscardDuplicates,
  warnings,
  className,
}) => (
  <header
    data-state={state}
    className={cn("space-y-2 border-b border-border pb-3", className)}
  >
    {warnings}
    {/* flex-wrap: at narrow widths the MI-3 action pair wraps under the
        counts line instead of pushing the page wide (mobile canon). */}
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="min-w-0 flex-1 text-sm text-text">
        <span className="font-semibold tabular-nums">{importCount}</span>{" "}
        {importCount === 1 ? "transaction" : "transactions"} staged
        {duplicateCount > 0 ? (
          <span className="text-text-2">
            {" "}
            ·{" "}
            <span className="tabular-nums text-warn-text">
              {duplicateCount}
            </span>{" "}
            {duplicateCount === 1 ? "duplicate" : "duplicates"} flagged for
            discard
          </span>
        ) : null}
      </p>
      {duplicateCount > 0 ? (
        <Button kind="quiet" size="sm" onClick={onDiscardDuplicates}>
          Discard {duplicateCount}{" "}
          {duplicateCount === 1 ? "duplicate" : "duplicates"}
        </Button>
      ) : null}
      {/* MI-3: the confirm button carries the import count. */}
      <Button size="sm" loading={state === "committing"} onClick={onCommit}>
        {state === "committing" ? "Committing…" : `Import ${importCount}`}
      </Button>
    </div>
  </header>
);

export default StagedReviewHeader;
