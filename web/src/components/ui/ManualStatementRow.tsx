"use client";

/**
 * ManualStatementRow — design.md §8.2: canonical-key combobox + amount
 * input · state default / error (identity check). Manual entry + the
 * mapping add-row; key options come from the closed line-item registry.
 */

import React from "react";
import { Trash2 } from "lucide-react";
import type { CanonicalKey } from "@/models/registry/line-items";
import { cn } from "@/lib/cn";
import Select, { type SelectOption } from "./Select";

export interface ManualStatementRowProps {
  /** Registry keys for the statement kind (closed vocabulary). */
  keyOptions: readonly CanonicalKey[];
  canonicalKey: CanonicalKey | null;
  amount: string;
  onKeyChange?: (key: CanonicalKey) => void;
  onAmountChange?: (amount: string) => void;
  onRemove?: () => void;
  /** Identity-check violation message (422 mapping_identity_violation). */
  error?: string | null;
  disabled?: boolean;
  className?: string;
}

export const ManualStatementRow: React.FC<ManualStatementRowProps> = ({
  keyOptions,
  canonicalKey,
  amount,
  onKeyChange,
  onAmountChange,
  onRemove,
  error = null,
  disabled = false,
  className,
}) => {
  const options: SelectOption[] = keyOptions.map((key) => ({
    value: key,
    label: key,
    mono: true,
  }));
  return (
    // Semantic list row (W3 directive): manual-entry rows compose <ul>.
    <li
      data-state={error ? "error" : "default"}
      className={cn("w-full list-none", className)}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            options={options}
            value={canonicalKey}
            onValueChange={(value) => onKeyChange?.(value as CanonicalKey)}
            searchable
            placeholder="canonical_key"
            disabled={disabled}
          />
        </div>
        <input
          aria-label="Amount"
          inputMode="decimal"
          value={amount}
          disabled={disabled}
          onChange={(event) => onAmountChange?.(event.target.value)}
          placeholder="0.00"
          className={cn(
            "h-10 w-40 rounded border bg-bg px-3 text-right text-sm tabular-nums text-text",
            "placeholder:text-text-2 transition-colors duration-fast ease-standard",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:bg-bg-elev disabled:opacity-60",
            error ? "border-expense" : "border-border",
          )}
        />
        {onRemove ? (
          <button
            type="button"
            aria-label="Remove row"
            disabled={disabled}
            onClick={onRemove}
            className="rounded p-1.5 text-text-2 transition-colors duration-fast ease-standard hover:text-expense focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-[13px] text-expense">
          {error}
        </p>
      ) : null}
    </li>
  );
};

export default ManualStatementRow;
