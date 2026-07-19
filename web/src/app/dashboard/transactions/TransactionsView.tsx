"use client";

/**
 * B2 `/dashboard/transactions` — Ledger (pages.md B2): full TxnTable with
 * filters (date range, category, source, direction, amount range,
 * anomaly-only), saved views, search, inline category edit (MI-4), row
 * inspector (MI-11, deep-linkable ?record=) with split + exclude
 * controls, anomaly-explain inspector state (design.md §8.2), "New
 * transaction" (manual path, also a ⌘K action), bulk re-categorize /
 * export selection, density toggle, and full keyboard nav (↑↓ / enter /
 * `e`, design.md §5). Render-only; controllers own the state.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import dayjs from "dayjs";
import {
  useCategoriesController,
  useOrg,
  useSavedViewsController,
} from "@/controllers";
import { useTransactionsController } from "@/controllers/use-transactions";
import { formatMoney } from "@/lib/format";
import type { TxnEntry, TxnFilters } from "@/models";
import AnomalyBadge from "@/components/ui/AnomalyBadge";
import Banner from "@/components/ui/Banner";
import BulkActionBar from "@/components/ui/BulkActionBar";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import EmptyState from "@/components/ui/EmptyState";
import FormRow from "@/components/ui/FormRow";
import Input from "@/components/ui/Input";
import Inspector from "@/components/ui/Inspector";
import Modal from "@/components/ui/Modal";
import MoneyCell from "@/components/ui/MoneyCell";
import PeriodPicker from "@/components/ui/PeriodPicker";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import TableHeader, { type SortDirection } from "@/components/ui/TableHeader";
import TxnTableRow from "@/components/ui/TxnTableRow";
import Toast from "@/components/ui/Toast";
import PageHeader from "../PageHeader";

// Registry default category color — data, not styling (documented raw-hex
// exception; mirrors the mock categories default).
const FALLBACK_CATEGORY_COLOR = "#6E6E76";

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "manual", label: "Manual" },
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
  { value: "receipt", label: "Receipt" },
  { value: "bank", label: "Bank" },
];

type InspectorState =
  | { kind: "closed" }
  | { kind: "record"; txnId: string }
  | { kind: "anomaly"; txnId: string }
  | { kind: "new" };

/** Editable inspector fields for the record variant + the manual path. */
interface TxnDraft {
  description: string;
  amount: string;
  direction: "income" | "expense";
  category_id: string | null;
  txn_date: string;
}

const draftFrom = (txn?: TxnEntry): TxnDraft => ({
  description: txn?.description ?? "",
  amount: txn ? String(txn.amount) : "",
  direction: txn?.direction ?? "expense",
  category_id: txn?.category_id ?? null,
  txn_date: txn?.txn_date ?? dayjs().format("YYYY-MM-DD"),
});

export const TransactionsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrg, activeOrgId } = useOrg();
  const currency = activeOrg?.currency ?? "NGN";
  const txns = useTransactionsController(activeOrgId);
  const { items: categories } = useCategoriesController(activeOrgId);
  const savedViews = useSavedViewsController(activeOrgId);

  const [density, setDensity] = useState<"compact" | "comfortable">(
    "comfortable",
  );
  const [sort, setSort] = useState<{
    columnId: string;
    direction: Exclude<SortDirection, "none">;
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [draft, setDraft] = useState<TxnDraft>(draftFrom());
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [splitAmount, setSplitAmount] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const tableRef = useRef<HTMLTableSectionElement>(null);

  // Deep-linkable inspector (MI-11): ?record= / ?explain= / ?new=.
  const recordId = searchParams.get("record");
  const inspector: InspectorState = searchParams.get("new")
    ? { kind: "new" }
    : recordId
      ? searchParams.get("explain")
        ? { kind: "anomaly", txnId: recordId }
        : { kind: "record", txnId: recordId }
      : { kind: "closed" };

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({ id: cat.id, name: cat.name, color: cat.color })),
    [categories],
  );
  const categoryById = useMemo(
    () => new Map(categoryOptions.map((cat) => [cat.id, cat])),
    [categoryOptions],
  );
  const categorySelectOptions = useMemo(
    () => categories.map((cat) => ({ value: cat.id, label: cat.name })),
    [categories],
  );

  const openInspector = useCallback(
    (next: InspectorState) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("record");
      params.delete("explain");
      params.delete("new");
      if (next.kind === "record") params.set("record", next.txnId);
      if (next.kind === "anomaly") {
        params.set("record", next.txnId);
        params.set("explain", "1");
      }
      if (next.kind === "new") params.set("new", "1");
      const qs = params.toString();
      router.replace(`/dashboard/transactions${qs ? `?${qs}` : ""}`);
      if (next.kind === "record" || next.kind === "anomaly") {
        const txn = txns.items.find((item) => item.id === next.txnId);
        setDraft(draftFrom(txn));
      }
      if (next.kind === "new") setDraft(draftFrom());
      setDraftError(null);
      setSplitAmount("");
    },
    [router, searchParams, txns.items],
  );
  const closeInspector = useCallback(
    () => openInspector({ kind: "closed" }),
    [openInspector],
  );

  const applyFilterPatch = (patch: Partial<TxnFilters>) => {
    setSelected(new Set());
    void txns.applyFilters({ ...txns.filters, ...patch, cursor: undefined });
  };

  const sorted = useMemo(() => {
    if (!sort) return txns.items;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...txns.items].sort((a, b) => {
      if (sort.columnId === "amount") return (a.amount - b.amount) * factor;
      if (sort.columnId === "description")
        return a.description.localeCompare(b.description) * factor;
      return a.txn_date.localeCompare(b.txn_date) * factor;
    });
  }, [sort, txns.items]);

  // Keyboard nav (design.md §5): ↑↓ move row focus; enter/`e` are row-level.
  const onTableKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const rows = Array.from(
      tableRef.current?.querySelectorAll<HTMLTableRowElement>("tr") ?? [],
    );
    const index = rows.indexOf(event.target as HTMLTableRowElement);
    if (index === -1) return;
    event.preventDefault();
    const next = rows[index + (event.key === "ArrowDown" ? 1 : -1)];
    next?.focus();
  };

  const allSelected =
    sorted.length > 0 && sorted.every((txn) => selected.has(txn.id));
  const someSelected = sorted.some((txn) => selected.has(txn.id));

  const exportSelection = () => {
    const rows = sorted.filter((txn) => selected.has(txn.id));
    const header = "date,description,category,direction,amount,currency";
    const csv = [
      header,
      ...rows.map((txn) =>
        [
          txn.txn_date,
          `"${txn.description.replace(/"/g, '""')}"`,
          categoryById.get(txn.category_id)?.name ?? txn.category_id,
          txn.direction,
          txn.amount,
          currency,
        ].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${rows.length} transactions`);
  };

  const bulkRecategorize = async () => {
    if (!bulkCategory) return;
    const ids = [...selected];
    await Promise.all(
      ids.map((id) => txns.update(id, { category_id: bulkCategory })),
    );
    setBulkOpen(false);
    setBulkCategory(null);
    setSelected(new Set());
    setToast(`${ids.length} transactions re-categorized`);
  };

  const activeTxn =
    inspector.kind === "record" || inspector.kind === "anomaly"
      ? txns.items.find((txn) => txn.id === inspector.txnId)
      : undefined;

  const saveDraft = async () => {
    const amount = Number(draft.amount);
    if (!draft.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setDraftError("Description and a positive amount are required.");
      return;
    }
    if (!draft.category_id) {
      setDraftError("Pick a category.");
      return;
    }
    setSaving(true);
    setDraftError(null);
    try {
      if (inspector.kind === "new") {
        await txns.create({
          description: draft.description.trim(),
          amount,
          direction: draft.direction,
          category_id: draft.category_id,
          txn_date: draft.txn_date,
        });
        setToast("Transaction added");
      } else if (activeTxn) {
        await txns.update(activeTxn.id, {
          description: draft.description.trim(),
          amount,
          direction: draft.direction,
          category_id: draft.category_id,
          txn_date: draft.txn_date,
        });
        setToast("Transaction updated");
      }
      closeInspector();
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const splitTxn = async () => {
    if (!activeTxn) return;
    const part = Number(splitAmount);
    if (!Number.isFinite(part) || part <= 0 || part >= activeTxn.amount) {
      setDraftError("Split amount must be between 0 and the total.");
      return;
    }
    setSaving(true);
    setDraftError(null);
    try {
      await txns.update(activeTxn.id, { amount: activeTxn.amount - part });
      await txns.create({
        description: `${activeTxn.description} (split)`,
        amount: part,
        direction: activeTxn.direction,
        category_id: activeTxn.category_id,
        txn_date: activeTxn.txn_date,
      });
      setToast("Transaction split");
      closeInspector();
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Split failed");
    } finally {
      setSaving(false);
    }
  };

  const comparableTxns = activeTxn
    ? txns.items
        .filter(
          (txn) =>
            txn.id !== activeTxn.id &&
            txn.category_id === activeTxn.category_id &&
            txn.direction === activeTxn.direction,
        )
        .slice(0, 4)
    : [];

  const isEmpty = !txns.loading && sorted.length === 0 && !txns.filters.search;

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every entry in your ledger — imported, synced, or manual."
        actions={
          <>
            <SegmentedControl
              aria-label="Density"
              options={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
              ]}
              value={density}
              onValueChange={(value) =>
                setDensity(value as "compact" | "comfortable")
              }
            />
            <Button size="sm" onClick={() => openInspector({ kind: "new" })}>
              <Plus aria-hidden className="mr-1 inline h-3.5 w-3.5" />
              New transaction
            </Button>
          </>
        }
      />

      {txns.error ? (
        <div className="mb-4">
          <Banner kind="error">{txns.error}</Banner>
        </div>
      ) : null}

      {/* Filter bar */}
      <section
        aria-label="Filters"
        className="mb-4 flex flex-wrap items-end gap-2"
      >
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
            placeholder="Search descriptions…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            kbdHint="↵"
          />
        </form>
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
          className="w-64"
        />
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
          className="w-40"
        />
        <Select
          aria-label="Source"
          options={SOURCE_OPTIONS}
          value={txns.filters.source ?? "all"}
          onValueChange={(value) =>
            applyFilterPatch({
              source:
                value === "all" ? undefined : (value as TxnFilters["source"]),
            })
          }
          size="sm"
          className="w-36"
        />
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
        <Input
          aria-label="Minimum amount"
          placeholder="Min ₦"
          className="w-24"
          value={txns.filters.amount_min?.toString() ?? ""}
          onChange={(event) =>
            applyFilterPatch({
              amount_min: event.target.value
                ? Number(event.target.value)
                : undefined,
            })
          }
        />
        <Input
          aria-label="Maximum amount"
          placeholder="Max ₦"
          className="w-24"
          value={txns.filters.amount_max?.toString() ?? ""}
          onChange={(event) =>
            applyFilterPatch({
              amount_max: event.target.value
                ? Number(event.target.value)
                : undefined,
            })
          }
        />
        <Checkbox
          label="Anomalies only"
          checked={txns.filters.anomaly_only ?? false}
          onCheckedChange={(checked) =>
            applyFilterPatch({ anomaly_only: checked === true || undefined })
          }
        />
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
          className="w-36"
        />
        <Button kind="quiet" size="sm" onClick={() => setSaveViewOpen(true)}>
          Save view
        </Button>
      </section>

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
        <section aria-label="Ledger">
          <table className="w-full border-separate border-spacing-0">
            <TableHeader
              density={density}
              sticky
              columns={[
                { id: "date", label: "Date", sortable: true, widthClass: "w-14" },
                { id: "source", label: "", widthClass: "w-4" },
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
                { id: "actions", label: "", widthClass: "w-20" },
              ]}
              sort={sort}
              onSortChange={(columnId, direction) =>
                setSort(
                  direction === "none" ? null : { columnId, direction },
                )
              }
              selectAll={{
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
                  categoryOptions={categoryOptions}
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
                  onOpen={() => openInspector({ kind: "record", txnId: txn.id })}
                  onEdit={() => openInspector({ kind: "record", txnId: txn.id })}
                  onSplit={() => {
                    openInspector({ kind: "record", txnId: txn.id });
                  }}
                  onExclude={() =>
                    void txns.update(txn.id, {
                      excluded_from_reports: !txn.excluded_from_reports,
                    })
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

      <BulkActionBar
        selectedCount={selected.size}
        onRecategorize={() => setBulkOpen(true)}
        onExport={exportSelection}
        onClear={() => setSelected(new Set())}
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
              disabled={!bulkCategory}
              onClick={() => void bulkRecategorize()}
            >
              Apply
            </Button>
          </div>
        }
      >
        <Select
          label="Category"
          options={categorySelectOptions}
          value={bulkCategory}
          onValueChange={setBulkCategory}
          placeholder="Pick a category"
        />
      </Modal>

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
          value={viewName}
          onChange={(event) => setViewName(event.target.value)}
          placeholder="e.g. June bank expenses"
        />
      </Modal>

      {/* Record inspector (MI-11) + manual "new transaction" path */}
      <Inspector
        open={inspector.kind === "record" || inspector.kind === "new"}
        onClose={closeInspector}
        title={inspector.kind === "new" ? "New transaction" : "Transaction"}
        variant="record"
        footer={
          <div className="flex items-center justify-between gap-2">
            {inspector.kind === "record" && activeTxn ? (
              <Button
                kind="destructive"
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
              <Button size="sm" loading={saving} onClick={() => void saveDraft()}>
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
                    setDraft((prev) => ({ ...prev, amount: event.target.value }))
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
                    }))
                  }
                />
              )}
            </FormRow>
          </div>
          <FormRow label="Category" required>
            {() => (
              <Select
                options={categorySelectOptions}
                value={draft.category_id}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, category_id: value }))
                }
                placeholder="Pick a category"
                searchable
              />
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
                    label={activeTxn.excluded_from_reports ? "Excluded" : "Included"}
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

      {/* Anomaly-explain inspector (design.md §8.2 variant) */}
      <Inspector
        open={inspector.kind === "anomaly"}
        onClose={closeInspector}
        title="Why this was flagged"
        variant="anomaly-explain"
        footer={
          <div className="flex justify-end gap-2">
            <Button kind="quiet" size="sm" onClick={closeInspector}>
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={() =>
                activeTxn &&
                openInspector({ kind: "record", txnId: activeTxn.id })
              }
            >
              Review transaction
            </Button>
          </div>
        }
      >
        {activeTxn && activeTxn.anomalies.length > 0 ? (
          <div className="space-y-4">
            <AnomalyBadge
              type={activeTxn.anomalies[0].rule_id}
              severity={activeTxn.anomalies[0].severity}
              variant="feed"
              description={activeTxn.anomalies[0].note}
            />
            <dl className="space-y-1 text-[13px]">
              <div className="flex justify-between gap-2">
                <dt className="text-text-2">Transaction</dt>
                <dd className="truncate">{activeTxn.description}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-2">Amount</dt>
                <dd>
                  <MoneyCell
                    amount={activeTxn.amount}
                    direction={activeTxn.direction}
                    currency={currency}
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-2">Severity</dt>
                <dd className="uppercase">{activeTxn.anomalies[0].severity}</dd>
              </div>
            </dl>
            <section aria-label="Comparable transactions">
              <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-2">
                Comparable transactions
              </h3>
              {comparableTxns.length === 0 ? (
                <p className="text-[13px] text-text-2">
                  No comparable transactions in this category yet.
                </p>
              ) : (
                <ul className="space-y-1 text-[13px]">
                  {comparableTxns.map((txn) => (
                    <li key={txn.id} className="flex justify-between gap-2">
                      <span className="truncate text-text-2">
                        {dayjs(txn.txn_date).format("D MMM")} ·{" "}
                        {txn.description}
                      </span>
                      <MoneyCell
                        amount={txn.amount}
                        direction={txn.direction}
                        currency={currency}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <p className="text-[13px] text-text-2">
            This transaction carries no anomaly flags.
          </p>
        )}
      </Inspector>

      {toast ? (
        <div className="fixed bottom-4 right-4 z-toast">
          <Toast kind="info" onDismiss={() => setToast(null)}>
            {toast}
          </Toast>
        </div>
      ) : null}
    </>
  );
};

export default TransactionsView;
