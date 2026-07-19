"use client";

/**
 * StagedReviewHeader — design.md §8.2b (MI-3): counts ("Import 209 /
 * discard 5 duplicates") · state reviewing / committing (cascade at the
 * table) · warnings-banner slot.
 */

import React from "react";
import { cn } from "@/lib/cn";
import Button from "./Button";

export interface StagedReviewHeaderProps {
  importCount: number;
  duplicateCount: number;
  state?: "reviewing" | "committing";
  onCommit?: () => void;
  onDiscardAll?: () => void;
  /** Warnings-banner slot (partial-extraction notices). */
  warnings?: React.ReactNode;
  className?: string;
}

export const StagedReviewHeader: React.FC<StagedReviewHeaderProps> = ({
  importCount,
  duplicateCount,
  state = "reviewing",
  onCommit,
  onDiscardAll,
  warnings,
  className,
}) => (
  <header
    data-state={state}
    className={cn("space-y-2 border-b border-border pb-3", className)}
  >
    {warnings}
    <div className="flex items-center gap-3">
      <p className="flex-1 text-sm text-text">
        <span className="font-semibold tabular-nums">{importCount}</span>{" "}
        {importCount === 1 ? "transaction" : "transactions"} staged
        {duplicateCount > 0 ? (
          <span className="text-text-2">
            {" "}
            · <span className="tabular-nums text-warn">
              {duplicateCount}
            </span>{" "}
            {duplicateCount === 1 ? "duplicate" : "duplicates"} flagged
          </span>
        ) : null}
      </p>
      <Button kind="quiet" size="sm" onClick={onDiscardAll}>
        Discard all
      </Button>
      {/* MI-3: the confirm button carries the counts. */}
      <Button
        size="sm"
        loading={state === "committing"}
        onClick={onCommit}
        aria-label={`Import ${importCount}, discard ${duplicateCount} ${
          duplicateCount === 1 ? "duplicate" : "duplicates"
        }`}
      >
        {state === "committing"
          ? "Committing…"
          : duplicateCount > 0
            ? `Import ${importCount} / discard ${duplicateCount} ${
                duplicateCount === 1 ? "duplicate" : "duplicates"
              }`
            : `Import ${importCount}`}
      </Button>
    </div>
  </header>
);

export default StagedReviewHeader;
