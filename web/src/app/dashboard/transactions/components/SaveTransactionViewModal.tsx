"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import type { useSavedViewsController } from "@/controllers";
import type { useTransactionsController } from "@/controllers/use-transactions";
import React from "react";

interface SaveTransactionViewModalProps {
  saveViewOpen: boolean;
  setSaveViewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  viewName: string;
  setViewName: React.Dispatch<React.SetStateAction<string>>;
  savedViews: ReturnType<typeof useSavedViewsController>;
  txns: ReturnType<typeof useTransactionsController>;
  search: string;
  setToast: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function SaveTransactionViewModal({
  saveViewOpen,
  setSaveViewOpen,
  viewName,
  setViewName,
  savedViews,
  txns,
  search,
  setToast,
}: SaveTransactionViewModalProps) {
  return (
    <>
      {/* Save current filters as a view */}
      <Modal
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        title="Save filter view"
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button kind="quiet" onClick={() => setSaveViewOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!viewName.trim()}
              onClick={() => {
                savedViews.save(viewName.trim(), {
                  ...txns.filters,
                  search: search || undefined,
                });
                setViewName("");
                setSaveViewOpen(false);
                setToast("View saved");
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        <Input
          label="View name"
          name="view-name"
          value={viewName}
          onChange={(event) => setViewName(event.target.value)}
          placeholder="e.g. June bank expenses"
        />
      </Modal>
    </>
  );
}
