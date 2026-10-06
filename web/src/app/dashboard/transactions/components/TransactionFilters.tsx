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
import { Filter, X } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

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
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const hasActiveDateRange = Boolean(
    txns.filters.date_from || txns.filters.date_to,
  );

  const activeSecondaryCount =
    (txns.filters.category_id && txns.filters.category_id !== "all" ? 1 : 0) +
    (txns.filters.source ? 1 : 0) +
    (hasActiveDateRange ? 1 : 0) +
    (txns.filters.amount_min !== undefined ? 1 : 0) +
    (txns.filters.amount_max !== undefined ? 1 : 0) +
    (txns.filters.anomaly_only ? 1 : 0);

  const hasActiveFilters = Boolean(
    activeSecondaryCount > 0 ||
    txns.filters.direction ||
    txns.filters.search ||
    search,
  );

  // Close popover on outside click or Escape key.
  useEffect(() => {
    if (!moreFilters) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !popoverRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setMoreFilters(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMoreFilters(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreFilters, setMoreFilters]);

  const handleClearAllFilters = () => {
    setSearch("");

    applyFilterPatch({
      category_id: undefined,
      source: undefined,
      date_from: undefined,
      date_to: undefined,
      direction: undefined,
      amount_min: undefined,
      amount_max: undefined,
      anomaly_only: undefined,
      search: undefined,
    });
  };

  return (
    <section aria-label="Filters" className="mb-4">
      {/* Top bar: Direction | Search | More filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Direction */}
        <div className="shrink-0">
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
        </div>

        {/* Search */}
        <form
          role="search"
          className="relative min-w-[200px] flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilterPatch({
              search: search || undefined,
            });
          }}
        >
          <Input
            type="search"
            aria-label="Search transactions"
            placeholder="Search transactions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            kbdHint="↵"
          />

          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                applyFilterPatch({
                  search: undefined,
                });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </form>

        {/* More filters */}
        <div className="relative shrink-0">
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreFilters}
            aria-label="More filters"
            onClick={() => setMoreFilters((prev) => !prev)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded border border-border bg-bg px-3.5 text-sm font-medium text-text shadow-xs",
              "transition-colors duration-fast ease-standard hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              moreFilters && "border-accent ring-2 ring-accent/20",
            )}
          >
            <Filter aria-hidden className="h-4 w-4 text-text-2" />

            <span>More filters</span>

            {activeSecondaryCount > 0 ? (
              <span className="ml-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-text">
                {activeSecondaryCount}
              </span>
            ) : null}
          </button>

          {/* Filters popover */}
          {moreFilters ? (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Filters"
              className="absolute right-0 top-full z-dropdown mt-1.5 w-[320px] max-w-[calc(100vw-32px)] space-y-3 rounded-lg border border-border bg-bg p-3.5 shadow-lg animate-fade-in motion-reduce:animate-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <h3 className="text-sm font-semibold text-text">Filters</h3>

                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => {
                    setMoreFilters(false);
                    triggerRef.current?.focus();
                  }}
                  className="rounded p-1 text-text-2 transition-colors duration-fast hover:bg-bg-elev hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>

              {/* Amount filters */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
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
                      className="h-8 w-full px-2.5 text-[13px]"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
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
                      className="h-8 w-full px-2.5 text-[13px]"
                    />
                  </div>
                </div>

                {/* Anomalies */}
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

              {/* Secondary filters */}
              <div className="space-y-1 divide-y divide-border/60">
                {/* Category */}
                <div className="pt-1">
                  <Select
                    aria-label="Category"
                    options={[
                      {
                        value: "all",
                        label: "All categories",
                      },
                      ...categorySelectOptions,
                    ]}
                    value={txns.filters.category_id ?? "all"}
                    onValueChange={(value) =>
                      applyFilterPatch({
                        category_id: value === "all" ? undefined : value,
                      })
                    }
                    size="sm"
                    className="w-full [&>button]:h-9 [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-2.5 [&>button]:py-2 [&>button]:text-[13px] hover:[&>button]:bg-bg-elev"
                  />
                </div>

                {/* Source */}
                <div className="pt-1">
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
                    className="w-full [&>button]:h-9 [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-2.5 [&>button]:py-2 [&>button]:text-[13px] hover:[&>button]:bg-bg-elev"
                  />
                </div>

                {/* Saved views */}
                <div className="pt-1">
                  <Select
                    aria-label="Saved views"
                    options={[
                      {
                        value: "none",
                        label: "Saved views…",
                      },
                      ...savedViews.views.map((view) => ({
                        value: view.id,
                        label: view.name,
                      })),
                    ]}
                    value="none"
                    onValueChange={(value) => {
                      const view = savedViews.views.find(
                        (item) => item.id === value,
                      );

                      if (view) {
                        setSearch(view.filters.search ?? "");
                        void txns.applyFilters(view.filters);
                      }
                    }}
                    size="sm"
                    className="w-full [&>button]:h-9 [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-2.5 [&>button]:py-2 [&>button]:text-[13px] hover:[&>button]:bg-bg-elev"
                  />
                </div>

                {/* Date range */}
                <div className="flex items-center pt-1">
                  <PeriodPicker
                    mode="range"
                    className="min-w-0 flex-1 [&>button]:h-9 [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-2.5 [&>button]:py-2 [&>button]:text-[13px] hover:[&>button]:bg-bg-elev"
                    value={
                      txns.filters.date_from && txns.filters.date_to
                        ? `${txns.filters.date_from}..${txns.filters.date_to}`
                        : null
                    }
                    onValueChange={(value) => {
                      const [from, to] = value.split("..");

                      applyFilterPatch({
                        date_from: from,
                        date_to: to,
                      });
                    }}
                  />

                  {hasActiveDateRange ? (
                    <button
                      type="button"
                      aria-label="Clear date range"
                      title="Clear date range"
                      onClick={(event) => {
                        event.stopPropagation();

                        applyFilterPatch({
                          date_from: undefined,
                          date_to: undefined,
                        });
                      }}
                      className="mr-1 rounded p-1 text-text-2 transition-colors duration-fast hover:bg-bg-elev hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <X aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <div>
                  {hasActiveFilters ? (
                    <Button
                      kind="quiet"
                      size="sm"
                      onClick={handleClearAllFilters}
                      className="text-text-2 hover:text-text"
                    >
                      Clear all filters
                    </Button>
                  ) : null}
                </div>

                <Button
                  kind="quiet"
                  size="sm"
                  onClick={() => {
                    setSaveViewOpen(true);
                    setMoreFilters(false);
                  }}
                >
                  Save view
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
