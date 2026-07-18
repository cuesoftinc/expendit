"use client";

/**
 * MappingReviewRow — design.md §8.2b: state suggested / confirmed /
 * unmapped · source text → mono canonical-key chip + confidence Tag
 * (✨ n% / Confirmed / Unmapped <60%) + tabular amount (the B6
 * mapping-review screen, flows/statement-mapping.md).
 */

import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import type { MappingRow } from "@/models";
import type { CanonicalKey } from "@/models/registry/line-items";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import Select, { type SelectOption } from "./Select";
import Tag from "./Tag";

export interface MappingReviewRowProps {
  row: MappingRow;
  /** Registry keys for the statement kind (closed vocabulary). */
  keyOptions: readonly CanonicalKey[];
  currency?: string;
  onKeyChange?: (key: CanonicalKey) => void;
  onConfirm?: () => void;
  className?: string;
}

export const MappingReviewRow: React.FC<MappingReviewRowProps> = ({
  row,
  keyOptions,
  currency = "NGN",
  onKeyChange,
  onConfirm,
  className,
}) => {
  const options: SelectOption[] = keyOptions.map((key) => ({
    value: key,
    label: key,
    mono: true,
  }));

  return (
    <div
      role="row"
      data-state={row.state}
      className={cn(
        "flex items-center gap-3 border-b border-border px-3 py-2 text-[13px]",
        row.state === "unmapped" && "bg-warn/5",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-text">
        {row.source_label}
      </span>
      <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-2" />
      <span className="w-56 shrink-0">
        <Select
          options={options}
          value={row.canonical_key}
          onValueChange={(value) => onKeyChange?.(value as CanonicalKey)}
          searchable
          size="md"
          placeholder="unmapped"
        />
      </span>
      <span className="w-28 shrink-0">
        {row.state === "suggested" ? (
          <Tag tint="info">
            <Sparkles
              aria-hidden
              className="mr-0.5 inline h-3 w-3"
              data-testid="mapping-ai-mark"
            />
            {Math.round((row.confidence ?? 0) * 100)}%
          </Tag>
        ) : row.state === "confirmed" ? (
          <Tag tint="success">Confirmed</Tag>
        ) : (
          <Tag tint="warn">Unmapped &lt;60%</Tag>
        )}
      </span>
      <span className="w-32 shrink-0 text-right tabular-nums text-text">
        {formatMoney(row.amount, currency)}
      </span>
      {onConfirm && row.state === "suggested" ? (
        <button
          type="button"
          onClick={onConfirm}
          className="rounded border border-border px-2 py-0.5 text-[11px] font-medium text-text transition-colors duration-fast ease-standard hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Confirm
        </button>
      ) : null}
    </div>
  );
};

export default MappingReviewRow;
