"use client";

import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import PeriodPicker from "@/components/ui/PeriodPicker";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import type { useSavedViewsController } from "@/controllers";
import type { useTransactionsController } from "@/controllers/use-transactions";
import type { TxnFilters } from "@/models";
import React from "react";

import type { SelectOption } from "@/components/ui/Select";

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "manual", label: "Manual" },
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
  { value: "receipt", label: "Receipt" },
  { value: "bank", label: "Bank" },
];

interface TransactionFiltersProps {
  txns: ReturnType<typeof useTransactionsController>;
  savedViews: ReturnType<typeof useSavedViewsController>;
  categorySelectOptions: SelectOption[];
  applyFilterPatch: (patch: Partial<TxnFilters>) => void;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  moreFilters: boolean;
  setMoreFilters: React.Dispatch<React.SetStateAction<boolean>>;
  setSaveViewOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function TransactionFilters({
  txns,
  savedViews,
  categorySelectOptions,
  applyFilterPatch,
  search,
  setSearch,
  moreFilters,
  setMoreFilters,
  setSaveViewOpen,
}: TransactionFiltersProps) {
  return (
    <>
      {/* Filter bar (Figma 182:455: primary row + More filters) */}
      <section aria-label="Filters" className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select
              aria-label="Category"
              options={[
                { value: "all", label: "All categories" },
                ...categorySelectOptions,
              ]}
              value={txns.filters.category_id ?? "all"}
              onValueChange={(value) =>
                applyFilterPatch({
                  category_id: value === "all" ? undefined : value,
                })
              }
              size="sm"
            />
          </div>
          <div className="w-36">
            <Select
              aria-label="Source"
              options={SOURCE_OPTIONS}
              value={txns.filters.source ?? "all"}
              onValueChange={(value) =>
                applyFilterPatch({
                  source:
                    value === "all"
                      ? undefined
                      : (value as TxnFilters["source"]),
                })
              }
              size="sm"
            />
          </div>
          <div className="w-64">
            <PeriodPicker
              mode="range"
              value={
                txns.filters.date_from && txns.filters.date_to
                  ? `${txns.filters.date_from}..${txns.filters.date_to}`
                  : null
              }
              onValueChange={(value) => {
                const [from, to] = value.split("..");
                applyFilterPatch({ date_from: from, date_to: to });
              }}
            />
          </div>
          {txns.filters.date_from || txns.filters.date_to ? (
            <Button
              kind="quiet"
              size="sm"
              onClick={() =>
                applyFilterPatch({ date_from: undefined, date_to: undefined })
              }
            >
              Clear date range
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form
            role="search"
            className="w-56"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilterPatch({ search: search || undefined });
            }}
          >
            <Input
              type="search"
              aria-label="Search transactions"
              placeholder="Search transactions…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              kbdHint="↵"
            />
          </form>
          <div className="w-40">
            <Select
              aria-label="Saved views"
              options={[
                { value: "none", label: "Saved views…" },
                ...savedViews.views.map((view) => ({
                  value: view.id,
                  label: view.name,
                })),
              ]}
              value="none"
              onValueChange={(value) => {
                const view = savedViews.views.find((item) => item.id === value);
                if (view) {
                  setSearch(view.filters.search ?? "");
                  void txns.applyFilters(view.filters);
                }
              }}
              size="sm"
            />
          </div>
          <Button kind="quiet" size="sm" onClick={() => setSaveViewOpen(true)}>
            Save view
          </Button>
          <Button
            kind="quiet"
            size="sm"
            aria-expanded={moreFilters}
            onClick={() => setMoreFilters((prev) => !prev)}
          >
            More filters
          </Button>
        </div>
        {moreFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label="Direction"
              options={[
                { value: "all", label: "All" },
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" },
              ]}
              value={txns.filters.direction ?? "all"}
              onValueChange={(value) =>
                applyFilterPatch({
                  direction:
                    value === "all"
                      ? undefined
                      : (value as TxnFilters["direction"]),
                })
              }
            />
            <div className="w-24">
              <Input
                aria-label="Minimum amount"
                placeholder="Min ₦"
                value={txns.filters.amount_min?.toString() ?? ""}
                onChange={(event) =>
                  applyFilterPatch({
                    amount_min: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <div className="w-24">
              <Input
                aria-label="Maximum amount"
                placeholder="Max ₦"
                value={txns.filters.amount_max?.toString() ?? ""}
                onChange={(event) =>
                  applyFilterPatch({
                    amount_max: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <Checkbox
              label="Anomalies only"
              checked={txns.filters.anomaly_only ?? false}
              onCheckedChange={(checked) =>
                applyFilterPatch({
                  anomaly_only: checked === true || undefined,
                })
              }
            />
          </div>
        ) : null}
      </section>
    </>
  );
}
