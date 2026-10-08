"use client";

/**
 * TxnTableRow — design.md §8.2: default / selected / editing /
 * staged-duplicate · density ×2. Row actions live in an always-visible
 * overflow menu so they remain discoverable on touch and keyboard input.
 * Row-level keyboard: `e` opens category edit (design.md §5).
 */

import React from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  EllipsisVertical,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Landmark,
  Pencil,
  Sparkles,
  Split,
} from "lucide-react";
import { formatIso } from "@/lib/dates";
import type { TxnEntry, TxnSource } from "@/models";
import { cn } from "@/lib/cn";
import { useAnchoredLayer } from "@/lib/use-anchored-layer";
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
  showYear?: boolean;
  showSourceLabel?: boolean;
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
  /** Inline AnomalyBadge click → anomaly-explain inspector (B2b). */
  onExplainAnomaly?: () => void;
}

export const TxnTableRow: React.FC<TxnTableRowProps> = ({
  txn,
  category,
  categoryOptions = [],
  showYear = false,
  showSourceLabel = false,
  density = "comfortable",
  selected = false,
  stagedDuplicate = false,
  onSelectedChange,
  onCategorySelect,
  onEdit,
  onSplit,
  onExclude,
  onOpen,
  onExplainAnomaly,
}) => {
  const { Icon: SourceIcon, label: sourceLabel } = SOURCE_ICON[txn.source];
  const anomaly = txn.anomalies[0];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRootRef = React.useRef<HTMLTableCellElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menuStyle = useAnchoredLayer(menuOpen, menuRootRef, menuRef);
  const dateFormat = showYear ? "d MMM yyyy" : "d MMM";
  const dateWidth = showYear ? "w-24" : "w-14";

  React.useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof MouseEvent &&
        (menuRootRef.current?.contains(event.target as Node) ||
          menuRef.current?.contains(event.target as Node))
      ) {
        return;
      }
      if (!(event instanceof KeyboardEvent) || event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, [menuOpen]);

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
    // Semantic table row (W3 directive): a real <tr> with <td> cells —
    // the ledger composes <table>/<tbody>, not div grids. The flex layout
    // classes override the UA table display, keeping the QA'd geometry.
    <tr
      tabIndex={0}
      aria-selected={selected}
      data-state={
        stagedDuplicate ? "staged-duplicate" : selected ? "selected" : "default"
      }
      onKeyDown={onKeyDown}
      onDoubleClick={onOpen}
      className={cn(
        "group relative flex w-full items-center gap-3 border-b border-border px-3 text-[13px] text-text lg:gap-2 xl:gap-3",
        "transition-colors duration-[60ms] ease-standard",
        density === "compact" ? "h-[32px]" : "h-[44px]",
        "hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
        // Figma: selected = accent tint row; staged-duplicate = warn tint.
        selected && "bg-accent/[0.08]",
        stagedDuplicate && "bg-warn/[0.08]",
        // Keep an open menu above the subsequent rows in the ledger.
        menuOpen && "z-50",
      )}
    >
      <td className="flex shrink-0 items-center">
        <Checkbox
          // Per-row accessible name (2026-07-21 a11y audit: unnamed row
          // selects were an axe button-name critical ×50).
          aria-label={`Select transaction ${txn.description}, ${formatIso(
            txn.txn_date,
            dateFormat,
          )}`}
          checked={selected}
          onCheckedChange={
            onSelectedChange
              ? (next) => onSelectedChange(next === true)
              : undefined
          }
        />
      </td>
      {/* Use the transaction date; the ledger also includes its year. */}
      <td
        className={cn(
          "shrink-0 whitespace-nowrap tabular-nums text-text-2",
          dateWidth,
        )}
      >
        {formatIso(txn.txn_date, dateFormat)}
      </td>
      {/* Figma: source icon sits between date and description. */}
      <td
        className={cn(
          "flex shrink-0 items-center",
          showSourceLabel ? "w-32 gap-1.5 lg:w-24 xl:w-32" : "w-8",
        )}
      >
        <SourceIcon
          aria-label={showSourceLabel ? undefined : sourceLabel}
          aria-hidden={showSourceLabel || undefined}
          className="h-3.5 w-3.5 shrink-0 text-text-2"
        />
        {showSourceLabel ? <span>{sourceLabel}</span> : null}
      </td>
      <td className="min-w-0 flex-1">
        <span className="block truncate">{txn.description}</span>
      </td>
      <td className="flex w-64 shrink-0 items-center gap-2 whitespace-nowrap lg:w-48 xl:w-64">
        <CategoryChip
          category={category}
          aiSuggested={txn.ai_categorized}
          options={categoryOptions}
          onSelect={onCategorySelect}
        />
        {stagedDuplicate ? (
          // Figma staged-duplicate: the inline Duplicate anomaly pill.
          <AnomalyBadge type="duplicate_charge" severity="info" />
        ) : anomaly ? (
          <AnomalyBadge
            type={anomaly.rule_id}
            severity={anomaly.severity}
            variant="inline"
            onClick={onExplainAnomaly}
          />
        ) : null}
      </td>
      <td className="w-32 shrink-0 text-right lg:w-28 xl:w-32">
        <MoneyCell
          amount={txn.amount}
          direction={txn.direction}
          withIcon={false}
        />
      </td>
      <td ref={menuRootRef} className="relative flex w-8 shrink-0 justify-end">
        <button
          type="button"
          aria-label={`Actions for ${txn.description}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded p-1 text-text-2 hover:bg-bg-elev hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <EllipsisVertical aria-hidden className="h-4 w-4" />
        </button>
        {menuOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={menuRef}
                role="menu"
                aria-label={`Actions for ${txn.description}`}
                style={menuStyle ?? { position: "fixed", visibility: "hidden" }}
                className="z-modal w-44 overflow-hidden rounded-md border border-border bg-bg p-1 shadow-[0_12px_32px_rgba(0,0,0,0.32)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onEdit?.();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] font-medium hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Pencil aria-hidden className="h-3.5 w-3.5 text-text-2" />
                  Edit transaction
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSplit?.();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] font-medium hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Split aria-hidden className="h-3.5 w-3.5 text-text-2" />
                  Split transaction
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExclude?.();
                    setMenuOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 border-t border-border px-2 py-1.5 text-left text-[12px] font-medium text-text-2 hover:bg-bg hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <EyeOff aria-hidden className="h-3.5 w-3.5" />
                  {txn.excluded_from_reports
                    ? "Include in reports"
                    : "Exclude from reports"}
                </button>
                {onExplainAnomaly ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onExplainAnomaly();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] font-medium hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Sparkles aria-hidden className="h-3.5 w-3.5 text-info" />
                    Explain anomaly
                  </button>
                ) : null}
              </div>,
              document.body,
            )
          : null}
      </td>
    </tr>
  );
};

export default TxnTableRow;
