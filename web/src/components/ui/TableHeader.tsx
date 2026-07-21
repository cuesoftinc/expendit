"use client";

/**
 * TableHeader — design.md §8.2b: density ×2 · sort none/asc/desc ·
 * column alignment text / numeric-right per instance · select-all
 * checkbox slot · sticky.
 */

import React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import Checkbox from "./Checkbox";

export type SortDirection = "none" | "asc" | "desc";

export interface TableColumn {
  id: string;
  label: string;
  /** numeric-right alignment (money columns). */
  numeric?: boolean;
  sortable?: boolean;
  /** Fixed width class, e.g. "w-32". */
  widthClass?: string;
  /**
   * Visually hidden label (a11y audit: the actions column shipped an
   * empty `<th>` — axe `empty-table-header`). The column keeps its
   * width; the name reads to AT only.
   */
  srOnly?: boolean;
}

export interface TableHeaderProps {
  columns: TableColumn[];
  density?: "compact" | "comfortable";
  sort?: { columnId: string; direction: Exclude<SortDirection, "none"> } | null;
  onSortChange?: (columnId: string, direction: SortDirection) => void;
  /** Select-all slot. `label` is its accessible name (a11y audit: the
   * select-all checkbox shipped unnamed — axe button-name critical). */
  selectAll?: {
    checked: boolean | "indeterminate";
    onCheckedChange: (checked: boolean | "indeterminate") => void;
    label: string;
  };
  /**
   * Presentational select-column header (sr-only name, checkbox-width
   * spacer) for tables whose rows carry select cells but no select-all
   * control — the demo/read-only TxnTableRow surfaces. Without it the
   * leading checkbox cell shifts every row one column past the header
   * (axe `td-has-header` on the home demo table, 2026-07-21 audit).
   */
  selectHeader?: string;
  sticky?: boolean;
  className?: string;
}

const nextDirection = (current: SortDirection): SortDirection =>
  current === "none" ? "asc" : current === "asc" ? "desc" : "none";

export const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  density = "comfortable",
  sort = null,
  onSortChange,
  selectAll,
  selectHeader,
  sticky = false,
  className,
}) => (
  // Semantic table chrome (W3 directive): a real <thead>/<tr>/<th scope>
  // structure — tables compose <table>, not div grids. Flex classes keep
  // the QA'd geometry over the UA table display.
  <thead className="contents">
    <tr
      data-density={density}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border bg-bg-elev px-3",
        density === "compact" ? "h-[32px]" : "h-[44px]",
        sticky && "sticky top-0 z-sticky",
        className,
      )}
    >
      {selectAll ? (
        <th scope="col" className="flex shrink-0 items-center">
          {/* sr-only text names the th itself (axe `empty-table-header`:
              the checkbox's aria-label doesn't reach the cell). */}
          <span className="sr-only">{selectAll.label}</span>
          <Checkbox
            aria-label={selectAll.label}
            checked={selectAll.checked}
            onCheckedChange={selectAll.onCheckedChange}
          />
        </th>
      ) : selectHeader ? (
        // Checkbox-width spacer (h-4/w-4 Checkbox root) keeps the header
        // grid aligned with the rows' leading select cells.
        <th scope="col" className="flex w-4 shrink-0 items-center">
          <span className="sr-only">{selectHeader}</span>
        </th>
      ) : null}
      {columns.map((column) => {
        const direction: SortDirection =
          sort?.columnId === column.id ? sort.direction : "none";
        const label = (
          <span
            className={cn(
              column.srOnly
                ? "sr-only"
                : "text-[11px] font-medium uppercase tracking-wide text-text-2",
              column.numeric && "tabular-nums",
            )}
          >
            {column.label}
          </span>
        );
        return (
          <th
            key={column.id}
            scope="col"
            aria-sort={
              direction === "none"
                ? undefined
                : direction === "asc"
                  ? "ascending"
                  : "descending"
            }
            className={cn(
              column.widthClass ?? "flex-1",
              "min-w-0 font-normal",
              column.numeric && "text-right",
            )}
          >
            {column.sortable ? (
              <button
                type="button"
                onClick={() =>
                  onSortChange?.(column.id, nextDirection(direction))
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded transition-colors duration-fast ease-standard hover:text-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  column.numeric && "flex-row-reverse",
                )}
              >
                {label}
                {direction === "asc" ? (
                  <ChevronUp aria-hidden className="h-3 w-3 text-accent" />
                ) : direction === "desc" ? (
                  <ChevronDown aria-hidden className="h-3 w-3 text-accent" />
                ) : (
                  <ChevronsUpDown aria-hidden className="h-3 w-3 text-text-2" />
                )}
              </button>
            ) : (
              label
            )}
          </th>
        );
      })}
    </tr>
  </thead>
);

export default TableHeader;
