"use client";
import { useId, useState } from "react";
import type { Category, CategoryType } from "@/models";
import type { useCategoriesController } from "@/controllers/use-categories";
import { ApiError } from "@/models/repositories";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ColorSwatchPicker from "@/components/ui/ColorSwatchPicker";
import { CATEGORY_COLORS } from "@/models/category-colors";
export const PRESET_COLORS = CATEGORY_COLORS;

export interface CategoryDraft {
  id?: string;
  name: string;
  type: CategoryType;
  color: string;
}

interface Props {
  initialDraft: CategoryDraft;
  createCategory: ReturnType<typeof useCategoriesController>["create"];
  updateCategory?: ReturnType<typeof useCategoriesController>["update"];
  onSaved: (category: Category) => void;
  onClose: () => void;
}
export default function CategoryEditor({
  initialDraft,
  createCategory,
  updateCategory,
  onSaved,
  onClose,
}: Props) {
  const nameId = useId();
  const [draft, setDraft] = useState<CategoryDraft | null>(initialDraft);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saveDraft = async () => {
    if (busy) return;
    if (!draft || !draft.name.trim()) {
      setDraftError("Name is required.");
      return;
    }
    setBusy(true);
    setDraftError(null);
    try {
      if (draft.id) {
        const category = await updateCategory!(draft.id, {
          name: draft.name.trim(),
          color: draft.color,
        });
        onSaved(category);
      } else {
        const category = await createCategory({
          name: draft.name.trim(),
          type: draft.type,
          color: draft.color,
          tax_treatment: "taxable_income",
          vat_treatment: "vatable",
          vat_basis: "inclusive",
        });
        onSaved(category);
      }
      onClose();
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

  return (
    <>
      {/* Create / edit */}
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
        title={draft?.id ? "Edit category" : "New category"}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button kind="quiet" disabled={busy} onClick={() => onClose()}>
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
              id={nameId}
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
    </>
  );
}
