"use client";

/**
 * TxnTableRow — design.md §8.2: default / hover (actions revealed) /
 * selected / editing / staged-duplicate · density ×2. MI-6: 60ms bg tint,
 * action icons fade in absolutely positioned — no layout shift. Row-level
 * keyboard: `e` opens category edit (design.md §5).
 */

import React from "react";
import {
  Camera,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Landmark,
  Pencil,
  Split,
} from "lucide-react";
import type { TxnEntry, TxnSource } from "@/models";
import { cn } from "@/lib/cn";
import AnomalyBadge from "./AnomalyBadge";
import CategoryChip, { type CategoryOption } from "./CategoryChip";
import Checkbox from "./Checkbox";
import MoneyCell from "./MoneyCell";

const SOURCE_ICON: Record<
  TxnSource,
  { Icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  manual: { Icon: Pencil, label: "Manual entry" },
  csv: { Icon: FileSpreadsheet, label: "CSV import" },
  pdf: { Icon: FileText, label: "PDF import" },
  receipt: { Icon: Camera, label: "Receipt capture" },
  bank: { Icon: Landmark, label: "Bank sync" },
};

export interface TxnTableRowProps {
  txn: TxnEntry;
  category: CategoryOption;
  categoryOptions?: CategoryOption[];
  density?: "compact" | "comfortable";
  selected?: boolean;
  /** Staged-review duplicate flag (MI-3 discard set). */
  stagedDuplicate?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  onCategorySelect?: (categoryId: string) => void;
  onEdit?: () => void;
  onSplit?: () => void;
  onExclude?: () => void;
  onOpen?: () => void;
}

export const TxnTableRow: React.FC<TxnTableRowProps> = ({
  txn,
  category,
  categoryOptions = [],
  density = "comfortable",
  selected = false,
  stagedDuplicate = false,
  onSelectedChange,
  onCategorySelect,
  onEdit,
  onSplit,
  onExclude,
  onOpen,
}) => {
  const { Icon: SourceIcon, label: sourceLabel } = SOURCE_ICON[txn.source];
  const anomaly = txn.anomalies[0];

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen?.();
    } else if (event.key === "e") {
      event.preventDefault();
      onEdit?.();
    }
  };

  return (
    <div
      role="row"
      tabIndex={0}
      aria-selected={selected}
      data-state={
        stagedDuplicate ? "staged-duplicate" : selected ? "selected" : "default"
      }
      onKeyDown={onKeyDown}
      onDoubleClick={onOpen}
      className={cn(
        "group relative flex w-full items-center gap-3 border-b border-border px-3 text-[13px] text-text",
        "transition-colors duration-[60ms] ease-standard",
        density === "compact" ? "h-[32px]" : "h-[44px]",
        "hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
        selected && "bg-accent/5",
        stagedDuplicate && "opacity-60",
      )}
    >
      {onSelectedChange ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(next) => onSelectedChange(next === true)}
        />
      ) : null}
      <span className="w-20 shrink-0 tabular-nums text-text-2">
        {txn.txn_date}
      </span>
      <span className="min-w-0 flex-1 truncate">{txn.description}</span>
      {stagedDuplicate ? (
        <span className="rounded border border-warn/40 bg-warn/10 px-1.5 text-[11px] font-medium text-warn">
          duplicate
        </span>
      ) : null}
      <CategoryChip
        category={category}
        aiSuggested={txn.ai_categorized}
        options={categoryOptions}
        onSelect={onCategorySelect}
      />
      <span className="w-32 shrink-0 text-right">
        <MoneyCell
          amount={txn.amount}
          direction={txn.direction}
          withIcon={false}
        />
      </span>
      <span className="w-6 shrink-0">
        {anomaly ? (
          <AnomalyBadge
            type={anomaly.rule_id}
            severity={anomaly.severity}
            variant="inline"
          />
        ) : null}
      </span>
      <SourceIcon
        aria-label={sourceLabel}
        className="h-3.5 w-3.5 shrink-0 text-text-2"
      />

      {/* MI-6: absolutely positioned actions — hover reveal, no layout shift. */}
      <span
        data-testid="row-actions"
        className={cn(
          "absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-border bg-bg px-1 py-0.5 shadow-sm",
          "opacity-0 transition-opacity duration-[60ms] ease-standard",
          "group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        <button
          type="button"
          aria-label="Edit category"
          onClick={onEdit}
          className="rounded p-1 text-text-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Split"
          onClick={onSplit}
          className="rounded p-1 text-text-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Split className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Exclude from reports"
          onClick={onExclude}
          className="rounded p-1 text-text-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
};

export default TxnTableRow;
