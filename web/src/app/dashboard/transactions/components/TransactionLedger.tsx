"use client";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import TableHeader, { type SortDirection } from "@/components/ui/TableHeader";
import TxnTableRow from "@/components/ui/TxnTableRow";
import type { useTransactionsController } from "@/controllers/use-transactions";
import type { TxnEntry } from "@/models";
import type { useRouter } from "next/navigation";
import React from "react";

import type { CategoryOption } from "@/components/ui/CategoryChip";
import type { InspectorState } from "./types";

// Registry default category color — data, not styling (documented raw-hex
// exception; mirrors the mock categories default).
const FALLBACK_CATEGORY_COLOR = "#6E6E76";

interface TransactionLedgerProps {
  txns: ReturnType<typeof useTransactionsController>;
  density: "compact" | "comfortable";
  isEmpty: boolean;
  router: ReturnType<typeof useRouter>;
  sort: { columnId: string; direction: Exclude<SortDirection, "none"> } | null;
  setSort: React.Dispatch<
    React.SetStateAction<{
      columnId: string;
      direction: Exclude<SortDirection, "none">;
    } | null>
  >;
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  sorted: TxnEntry[];
  tableRef: React.RefObject<HTMLTableSectionElement | null>;
  onTableKeyDown: (event: React.KeyboardEvent) => void;
  allSelected: boolean;
  someSelected: boolean;
  categoryById: Map<string, CategoryOption>;
  categoryOptionsByDirection: Record<"income" | "expense", CategoryOption[]>;
  openInspector: (next: InspectorState) => void;
}

export default function TransactionLedger({
  txns,
  density,
  isEmpty,
  router,
  sort,
  setSort,
  selected,
  setSelected,
  sorted,
  tableRef,
  onTableKeyDown,
  allSelected,
  someSelected,
  categoryById,
  categoryOptionsByDirection,
  openInspector,
}: TransactionLedgerProps) {
  return (
    <>
      {/* Ledger table (semantic <table>, design directive) */}
      {txns.loading && sorted.length === 0 ? (
        <div className="space-y-0">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} variant="row" density={density} />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          kind="transactions"
          onAction={() => router.push("/dashboard/imports?upload=1")}
          className="mx-auto mt-16 max-w-md"
        />
      ) : (
        // Mobile canon: below lg the ledger scrolls horizontally inside
        // this container — the page itself never side-scrolls; ≥lg keeps
        // the sticky header against the main scroll.
        <section aria-label="Ledger" className="max-lg:overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <TableHeader
              density={density}
              sticky
              columns={[
                {
                  id: "date",
                  label: "Date",
                  sortable: true,
                  widthClass: "w-14",
                },
                { id: "source", label: "Src", widthClass: "w-8" },
                {
                  id: "description",
                  label: "Description",
                  sortable: true,
                },
                { id: "category", label: "Category", widthClass: "w-40" },
                {
                  id: "amount",
                  label: "Amount",
                  numeric: true,
                  sortable: true,
                  widthClass: "w-32",
                },
                // sr-only name (axe `empty-table-header`): the hover
                // action cluster needs a named column, not a blank th.
                {
                  id: "actions",
                  label: "Actions",
                  srOnly: true,
                  widthClass: "w-20",
                },
              ]}
              sort={sort}
              onSortChange={(columnId, direction) =>
                setSort(direction === "none" ? null : { columnId, direction })
              }
              selectAll={{
                label: "Select all transactions",
                checked: allSelected
                  ? true
                  : someSelected
                    ? "indeterminate"
                    : false,
                onCheckedChange: (checked) =>
                  setSelected(
                    checked === true
                      ? new Set(sorted.map((txn) => txn.id))
                      : new Set(),
                  ),
              }}
            />
            <tbody
              ref={tableRef}
              className="contents"
              onKeyDown={onTableKeyDown}
            >
              {sorted.map((txn) => (
                <TxnTableRow
                  key={txn.id}
                  txn={txn}
                  density={density}
                  category={
                    categoryById.get(txn.category_id) ?? {
                      id: txn.category_id,
                      name: txn.category_id,
                      color: FALLBACK_CATEGORY_COLOR,
                    }
                  }
                  categoryOptions={categoryOptionsByDirection[txn.direction]}
                  selected={selected.has(txn.id)}
                  onSelectedChange={(isSelected) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (isSelected) next.add(txn.id);
                      else next.delete(txn.id);
                      return next;
                    })
                  }
                  onCategorySelect={(categoryId) =>
                    void txns.update(txn.id, { category_id: categoryId })
                  }
                  onOpen={() =>
                    openInspector({ kind: "record", txnId: txn.id })
                  }
                  onEdit={() =>
                    openInspector({ kind: "record", txnId: txn.id })
                  }
                  onSplit={() => {
                    openInspector({ kind: "record", txnId: txn.id });
                  }}
                  onExclude={() =>
                    void txns.update(txn.id, {
                      excluded_from_reports: !txn.excluded_from_reports,
                    })
                  }
                  onExplainAnomaly={
                    txn.anomalies.length > 0
                      ? () => openInspector({ kind: "anomaly", txnId: txn.id })
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
          {txns.nextCursor ? (
            <div className="flex justify-center py-3">
              <Button
                kind="quiet"
                size="sm"
                loading={txns.loading}
                onClick={() => void txns.loadMore()}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </>
  );
}
