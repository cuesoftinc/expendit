"use client";

/**
 * B8 `/dashboard/categories` — Categories (pages.md B8): CRUD with
 * color dot (ColorSwatchPicker presets), the merge tool (repoints ledger
 * + staged rows), and the AI-training note. 409 category_in_use on
 * delete pivots to merge. Render-only.
 */

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useCategoriesController, useOrg } from "@/controllers";
import { ApiError } from "@/models/repositories";
import type { Category, CategoryType } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import CategoryChip from "@/components/ui/CategoryChip";
import ColorSwatchPicker from "@/components/ui/ColorSwatchPicker";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "../PageHeader";
import ToastLayer from "../ToastLayer";

// Registry preset palette (data, not styling — B8 ColorSwatchPicker).
const PRESET_COLORS = [
  "#F46A1F",
  "#1B7F4B",
  "#C6373C",
  "#2456D6",
  "#B26A00",
  "#6E4BD6",
  "#0E8B8B",
  "#6E6E76",
];

interface CategoryDraft {
  id?: string;
  name: string;
  type: CategoryType;
  color: string;
}

interface CategoryListProps {
  title: string;
  items: Category[];
  onEdit: (category: Category) => void;
  onMerge: (category: Category) => void;
  onDelete: (category: Category) => void;
}

/** B8 usage meta: "N transactions this year" (+ AI-proposal provenance). */
const usageMeta = (category: Category): string => {
  const count = category.txn_count_ytd ?? 0;
  const usage = `${count} ${count === 1 ? "transaction" : "transactions"} this year`;
  return category.ai_note ? `${usage} · ${category.ai_note}` : usage;
};

const CategoryList: React.FC<CategoryListProps> = ({
  title,
  items,
  onEdit,
  onMerge,
  onDelete,
}) => (
  <section aria-label={title} className="rounded border border-border bg-bg">
    <header className="border-b border-border px-4 py-2.5">
      <h2 className="text-[13px] font-medium text-text">{title}</h2>
    </header>
    {items.length === 0 ? (
      <p className="px-4 py-6 text-center text-[13px] text-text-2">None yet.</p>
    ) : (
      <ul className="list-none">
        {items.map((category) => (
          <li
            key={category.id}
            data-ai-proposed={category.ai_proposed || undefined}
            // flex-wrap: at narrow widths the action cluster wraps under
            // the chip instead of pushing the page wide (mobile canon).
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-2 last:border-b-0"
          >
            <CategoryChip
              category={{
                id: category.id,
                name: category.name,
                color: category.color,
              }}
              // ✨ on AI-proposed rows (B8 frame) until a human edit
              // confirms the registry entry.
              aiSuggested={category.ai_proposed ?? false}
            />
            {/* Usage meta — merge-safety context (B8 frame). */}
            <span className="min-w-0 flex-1 truncate text-[12px] text-text-2">
              {usageMeta(category)}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <Button kind="quiet" size="sm" onClick={() => onEdit(category)}>
                Edit
              </Button>
              <Button kind="quiet" size="sm" onClick={() => onMerge(category)}>
                Merge
              </Button>
              <Button
                kind="destructive"
                size="sm"
                onClick={() => onDelete(category)}
              >
                Delete
              </Button>
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export const CategoriesView: React.FC = () => {
  const searchParams = useSearchParams();
  const { activeOrgId } = useOrg();
  const categories = useCategoriesController(activeOrgId);

  const [draft, setDraft] = useState<CategoryDraft | null>(
    searchParams.get("new") === "1"
      ? { name: "", type: "expense", color: PRESET_COLORS[0] }
      : null,
  );
  const [draftError, setDraftError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mergeSource, setMergeSource] = useState<Category | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  // Danger pattern: per-row delete confirms before it fires (B8 review).
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const expenseCategories = useMemo(
    () => categories.items.filter((cat) => cat.type === "expense"),
    [categories.items],
  );
  const incomeCategories = useMemo(
    () => categories.items.filter((cat) => cat.type === "income"),
    [categories.items],
  );

  const saveDraft = async () => {
    if (!draft || !draft.name.trim()) {
      setDraftError("Name is required.");
      return;
    }
    setBusy(true);
    setDraftError(null);
    try {
      if (draft.id) {
        await categories.update(draft.id, {
          name: draft.name.trim(),
          color: draft.color,
        });
        setToast("Category updated");
      } else {
        await categories.create({
          name: draft.name.trim(),
          type: draft.type,
          color: draft.color,
          tax_treatment: "taxable_income",
          vat_treatment: "vatable",
          vat_basis: "inclusive",
        });
        setToast("Category created");
      }
      setDraft(null);
    } catch (err) {
      setDraftError(
        err instanceof ApiError && err.code === "category_exists"
          ? "A category with this name already exists."
          : err instanceof Error
            ? err.message
            : "Save failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const removeCategory = async (category: Category) => {
    try {
      await categories.remove(category.id);
      setToast("Category deleted");
    } catch (err) {
      if (err instanceof ApiError && err.code === "category_in_use") {
        // The delete guard pivots to the merge tool.
        setMergeSource(category);
      } else {
        setToast(err instanceof Error ? err.message : "Delete failed");
      }
    }
  };

  const runMerge = async () => {
    if (!mergeSource || !mergeTarget) return;
    setBusy(true);
    try {
      const result = await categories.merge(mergeSource.id, mergeTarget);
      setToast(
        `Merged into ${result.category.name} — ${result.moved_transactions} transactions moved`,
      );
      setMergeSource(null);
      setMergeTarget(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="The registry behind every chip, donut slice, and tax treatment."
        actions={
          <Button
            size="sm"
            onClick={() =>
              setDraft({ name: "", type: "expense", color: PRESET_COLORS[0] })
            }
          >
            <Plus aria-hidden className="mr-1 inline h-3.5 w-3.5" />
            New category
          </Button>
        }
      />

      {categories.error ? (
        <div className="mb-4">
          <Banner kind="error">{categories.error}</Banner>
        </div>
      ) : null}

      <div className="mb-4">
        {/* Banner kind="info" supplies its own leading icon — no manual
            Sparkles (double-icon bug, audit B8). */}
        <Banner kind="info">
          Your category corrections train the AI — re-categorized imports
          improve future suggestions for this workspace.
        </Banner>
      </div>

      {categories.loading && categories.items.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} variant="chart" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CategoryList
            title="Expense categories"
            items={expenseCategories}
            onEdit={(category) =>
              setDraft({
                id: category.id,
                name: category.name,
                type: category.type,
                color: category.color,
              })
            }
            onMerge={setMergeSource}
            onDelete={setConfirmDelete}
          />
          <CategoryList
            title="Income categories"
            items={incomeCategories}
            onEdit={(category) =>
              setDraft({
                id: category.id,
                name: category.name,
                type: category.type,
                color: category.color,
              })
            }
            onMerge={setMergeSource}
            onDelete={setConfirmDelete}
          />
        </div>
      )}

      {/* Create / edit */}
      <Modal
        open={draft !== null}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        title={draft?.id ? "Edit category" : "New category"}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button kind="quiet" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void saveDraft()}>
              {draft?.id ? "Save" : "Create"}
            </Button>
          </div>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <Input
              label="Name"
              name="category-name"
              value={draft.name}
              onChange={(event) =>
                setDraft(
                  (prev) => prev && { ...prev, name: event.target.value },
                )
              }
              placeholder="e.g. Software subscriptions"
            />
            {!draft.id ? (
              <SegmentedControl
                aria-label="Type"
                options={[
                  { value: "expense", label: "Expense" },
                  { value: "income", label: "Income" },
                ]}
                value={draft.type}
                onValueChange={(value) =>
                  setDraft(
                    (prev) => prev && { ...prev, type: value as CategoryType },
                  )
                }
              />
            ) : null}
            <ColorSwatchPicker
              aria-label="Color"
              presets={PRESET_COLORS}
              value={draft.color}
              onValueChange={(color) =>
                setDraft((prev) => prev && { ...prev, color })
              }
            />
            {draftError ? (
              <p role="alert" className="text-[13px] text-expense">
                {draftError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Delete confirm — the danger pattern applies to every
          destructive row action (B8 review; category_in_use pivots the
          confirmed delete to the merge tool). */}
      <Modal
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title={`Delete "${confirmDelete?.name ?? ""}"?`}
        description="Unused categories are removed immediately; in-use ones pivot to the merge tool so history is never orphaned."
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button kind="quiet" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              kind="destructive"
              onClick={() => {
                const category = confirmDelete;
                setConfirmDelete(null);
                if (category) void removeCategory(category);
              }}
            >
              Delete category
            </Button>
          </div>
        }
      />

      {/* Merge tool */}
      <Modal
        open={mergeSource !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMergeSource(null);
            setMergeTarget(null);
          }
        }}
        title={`Merge "${mergeSource?.name ?? ""}"`}
        description="Transactions and staged imports move to the target; the source category is removed."
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              kind="quiet"
              onClick={() => {
                setMergeSource(null);
                setMergeTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              kind="destructive"
              disabled={!mergeTarget}
              loading={busy}
              onClick={() => void runMerge()}
            >
              Merge
            </Button>
          </div>
        }
      >
        <Select
          label="Merge into"
          options={categories.items
            .filter(
              (cat) =>
                cat.id !== mergeSource?.id && cat.type === mergeSource?.type,
            )
            .map((cat) => ({ value: cat.id, label: cat.name }))}
          value={mergeTarget}
          onValueChange={setMergeTarget}
          placeholder="Pick the surviving category"
        />
      </Modal>

      <ToastLayer message={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default CategoriesView;
