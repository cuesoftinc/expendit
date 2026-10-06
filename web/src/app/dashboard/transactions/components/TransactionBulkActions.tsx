"use client";

import Banner from "@/components/ui/Banner";
import BulkActionBar from "@/components/ui/BulkActionBar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import React from "react";

import type { SelectOption } from "@/components/ui/Select";

interface TransactionBulkActionsProps {
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  bulkCategoryApplies: boolean;
  setBulkCategory: React.Dispatch<React.SetStateAction<string | null>>;
  setBulkOpen: React.Dispatch<React.SetStateAction<boolean>>;
  exportSelection: () => void;
  setBulkDeleteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  bulkDeleteOpen: boolean;
  bulkDelete: () => Promise<void>;
  bulkOpen: boolean;
  bulkRecategorize: () => Promise<void>;
  selectedDirection: "income" | "expense" | "mixed" | null;
  categorySelectOptionsByDirection: Record<
    "income" | "expense",
    SelectOption[]
  >;
  categorySelectOptions: SelectOption[];
  bulkCategory: string | null;
}

export default function TransactionBulkActions({
  selected,
  setSelected,
  bulkCategoryApplies,
  setBulkCategory,
  setBulkOpen,
  exportSelection,
  setBulkDeleteOpen,
  bulkDeleteOpen,
  bulkDelete,
  bulkOpen,
  bulkRecategorize,
  selectedDirection,
  categorySelectOptionsByDirection,
  categorySelectOptions,
  bulkCategory,
}: TransactionBulkActionsProps) {
  return (
    <>
      {/* Floats over the ledger at the viewport bottom — selecting rows
          anywhere in a long table keeps the bar visible (system QA
          2026-07-19: in normal flow it rendered below the fold and a
          selection showed no affordance at all). z-sticky per the §2
          layer registry; the component's own slide-in animates entry. */}
      {selected.size > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-sticky flex justify-center">
          <BulkActionBar
            className="pointer-events-auto"
            selectedCount={selected.size}
            onRecategorize={() => {
              if (!bulkCategoryApplies) setBulkCategory(null);
              setBulkOpen(true);
            }}
            onExport={exportSelection}
            onDelete={() => setBulkDeleteOpen(true)}
            onClear={() => setSelected(new Set())}
          />
        </div>
      ) : null}

      {/* Bulk delete — danger confirm (master 123:1126). */}
      <Modal
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        variant="danger"
        title={`Delete ${selected.size} transaction${selected.size === 1 ? "" : "s"}?`}
        description="Deleted entries leave the ledger and every report immediately."
        size="sm"
        confirmLabel="Delete"
        onConfirm={() => void bulkDelete()}
      />

      {/* Bulk re-categorize (MI-4 at scale) */}
      <Modal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={`Re-categorize ${selected.size} transactions`}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button kind="quiet" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!bulkCategoryApplies}
              onClick={() => void bulkRecategorize()}
            >
              Apply
            </Button>
          </div>
        }
      >
        {selectedDirection === "mixed" ? (
          <Banner kind="warn">
            The selection mixes income and expense rows — categories are typed,
            so pick rows of one direction to re-categorize together.
          </Banner>
        ) : (
          <Select
            label="Category"
            options={
              selectedDirection
                ? categorySelectOptionsByDirection[selectedDirection]
                : categorySelectOptions
            }
            value={bulkCategory}
            onValueChange={setBulkCategory}
            placeholder="Pick a category"
          />
        )}
      </Modal>
    </>
  );
}
