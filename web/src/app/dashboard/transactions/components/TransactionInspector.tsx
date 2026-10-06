"use client";

import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import FormRow from "@/components/ui/FormRow";
import Input from "@/components/ui/Input";
import Inspector from "@/components/ui/Inspector";
import PeriodPicker from "@/components/ui/PeriodPicker";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import type { useTransactionsController } from "@/controllers/use-transactions";
import { formatMoney } from "@/lib/format";
import type { TxnEntry } from "@/models";
import React, { useState } from "react";

import type { SelectOption } from "@/components/ui/Select";
import type { InspectorState, TxnDraft } from "./types";

import CategoryEditor, { PRESET_COLORS } from "@/components/ui/CategoryEditor";
import type { useCategoriesController } from "@/controllers/use-categories";

interface TransactionInspectorProps {
  createCategory: ReturnType<typeof useCategoriesController>["create"];
  inspector: InspectorState;
  closeInspector: () => void;
  activeTxn: TxnEntry | undefined;
  txns: ReturnType<typeof useTransactionsController>;
  setToast: React.Dispatch<React.SetStateAction<string | null>>;
  saving: boolean;
  saveDraft: () => Promise<void>;
  draft: TxnDraft;
  setDraft: React.Dispatch<React.SetStateAction<TxnDraft>>;
  categoryTypeById: Map<string, "income" | "expense">;
  categorySelectOptionsByDirection: Record<
    "income" | "expense",
    SelectOption[]
  >;
  currency: string;
  splitAmount: string;
  setSplitAmount: React.Dispatch<React.SetStateAction<string>>;
  splitTxn: () => Promise<void>;
  draftError: string | null;
}

export default function TransactionInspector({
  createCategory,
  inspector,
  closeInspector,
  activeTxn,
  txns,
  setToast,
  saving,
  saveDraft,
  draft,
  setDraft,
  categoryTypeById,
  categorySelectOptionsByDirection,
  currency,
  splitAmount,
  setSplitAmount,
  splitTxn,
  draftError,
}: TransactionInspectorProps) {
  const [creatingCategory, setCreatingCategory] = useState(false);
  return (
    <>
      {/* Record inspector (MI-11) + manual "new transaction" path */}
      <Inspector
        open={inspector.kind === "record" || inspector.kind === "new"}
        onClose={creatingCategory ? () => {} : closeInspector}
        title={inspector.kind === "new" ? "New transaction" : "Transaction"}
        variant="record"
        footer={
          <div className="flex items-center justify-between gap-2">
            {inspector.kind === "record" && activeTxn ? (
              // Danger ladder: the editor-footer Delete is the master's
              // "Button (quiet-danger)" — danger text on quiet chrome,
              // never a filled block (SKILL.md, ratified 2026-07-20).
              <Button
                kind="quiet-danger"
                size="sm"
                onClick={() => {
                  void txns.remove(activeTxn.id).then(() => {
                    setToast("Transaction deleted");
                    closeInspector();
                  });
                }}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button kind="quiet" size="sm" onClick={closeInspector}>
                Cancel
              </Button>
              <Button
                size="sm"
                loading={saving}
                onClick={() => void saveDraft()}
              >
                {inspector.kind === "new" ? "Add transaction" : "Save"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <FormRow label="Description" required>
            {(id) => (
              <Input
                id={id}
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            )}
          </FormRow>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Amount" required>
              {(id) => (
                <Input
                  id={id}
                  value={draft.amount}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              )}
            </FormRow>
            <FormRow label="Direction">
              {() => (
                <SegmentedControl
                  aria-label="Direction"
                  options={[
                    { value: "expense", label: "Expense" },
                    { value: "income", label: "Income" },
                  ]}
                  value={draft.direction}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      direction: value as "income" | "expense",
                      // Direction switch drops a now-mismatched category
                      // (typed registry — same-direction only).
                      category_id:
                        prev.category_id &&
                        categoryTypeById.get(prev.category_id) === value
                          ? prev.category_id
                          : null,
                    }))
                  }
                />
              )}
            </FormRow>
          </div>
          <FormRow label="Category" required>
            {() => (
              <div className="space-y-2">
                <Select
                  aria-label="Category"
                  options={categorySelectOptionsByDirection[draft.direction]}
                  value={draft.category_id}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, category_id: value }))
                  }
                  placeholder="Pick a category"
                  searchable
                  trailingAction={
                    inspector.kind === "new"
                      ? {
                          label: "Create category",
                          onSelect: () => setCreatingCategory(true),
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </FormRow>
          <FormRow label="Date">
            {() => (
              <PeriodPicker
                mode="day"
                value={draft.txn_date}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, txn_date: value }))
                }
              />
            )}
          </FormRow>

          {inspector.kind === "record" && activeTxn ? (
            <>
              <FormRow
                label="Exclude from reports"
                helper="Kept in the ledger, ignored by charts and reports."
              >
                {(id) => (
                  <Checkbox
                    id={id}
                    checked={activeTxn.excluded_from_reports}
                    onCheckedChange={(checked) =>
                      void txns.update(activeTxn.id, {
                        excluded_from_reports: checked === true,
                      })
                    }
                    label={
                      activeTxn.excluded_from_reports ? "Excluded" : "Included"
                    }
                  />
                )}
              </FormRow>
              <fieldset className="rounded border border-border p-3">
                <legend className="px-1 text-[11px] font-medium uppercase tracking-wide text-text-2">
                  Split transaction
                </legend>
                <div className="flex items-end gap-2">
                  <Input
                    label={`Split off (of ${formatMoney(activeTxn.amount, currency)})`}
                    name="split-amount"
                    value={splitAmount}
                    onChange={(event) => setSplitAmount(event.target.value)}
                    placeholder="0.00"
                  />
                  <Button
                    kind="quiet"
                    size="sm"
                    disabled={!splitAmount}
                    loading={saving}
                    onClick={() => void splitTxn()}
                  >
                    Split
                  </Button>
                </div>
              </fieldset>
            </>
          ) : null}

          {draftError ? (
            <p role="alert" className="text-[13px] text-expense">
              {draftError}
            </p>
          ) : null}
        </div>
      </Inspector>
      {creatingCategory && inspector.kind === "new" ? (
        <CategoryEditor
          initialDraft={{
            name: "",
            type: draft.direction,
            color: PRESET_COLORS[0],
          }}
          createCategory={createCategory}
          onSaved={(category) => {
            setDraft((prev) => ({
              ...prev,
              direction: category.type,
              category_id: category.id,
            }));
            setToast("Category created");
          }}
          onClose={() => setCreatingCategory(false)}
        />
      ) : null}
    </>
  );
}
