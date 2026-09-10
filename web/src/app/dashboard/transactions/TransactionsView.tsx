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

import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type SortDirection } from "@/components/ui/TableHeader";
import {
  useCategoriesController,
  useOrg,
  useSavedViewsController,
} from "@/controllers";
import { useTransactionsController } from "@/controllers/use-transactions";
import { todayIso } from "@/lib/dates";
import type { TxnEntry, TxnFilters } from "@/models";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PageHeader from "../PageHeader";
import ToastLayer from "../ToastLayer";

import SaveTransactionViewModal from "./components/SaveTransactionViewModal";
import TransactionAnomalyInspector from "./components/TransactionAnomalyInspector";
import TransactionBulkActions from "./components/TransactionBulkActions";
import TransactionFilters from "./components/TransactionFilters";
import TransactionInspector from "./components/TransactionInspector";
import TransactionLedger from "./components/TransactionLedger";
import type { InspectorState, TxnDraft } from "./components/types";

const draftFrom = (txn?: TxnEntry): TxnDraft => ({
  description: txn?.description ?? "",
  amount: txn ? String(txn.amount) : "",
  direction: txn?.direction ?? "expense",
  category_id: txn?.category_id ?? null,
  txn_date: txn?.txn_date ?? todayIso(),
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
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [draft, setDraft] = useState<TxnDraft>(draftFrom());
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [splitAmount, setSplitAmount] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const tableRef = useRef<HTMLTableSectionElement>(null);

  // ?anomalies=1 (B1 anomaly feed handoff) pre-applies the filter once.
  const anomaliesParam = searchParams.get("anomalies") === "1";
  const [anomalyParamApplied, setAnomalyParamApplied] = useState(false);
  useEffect(() => {
    if (!anomaliesParam || anomalyParamApplied || !activeOrgId) return;
    // Defer to a microtask — effects must not set state synchronously.
    queueMicrotask(() => {
      setAnomalyParamApplied(true);
      void txns.applyFilters({ anomaly_only: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anomaliesParam, anomalyParamApplied, activeOrgId]);

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
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
      })),
    [categories],
  );
  const categoryById = useMemo(
    () => new Map(categoryOptions.map((cat) => [cat.id, cat])),
    [categoryOptions],
  );
  const categoryTypeById = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat.type])),
    [categories],
  );
  const categorySelectOptions = useMemo(
    () => categories.map((cat) => ({ value: cat.id, label: cat.name })),
    [categories],
  );
  // Categories are typed income/expense (B8 registry) — recategorize can
  // only land on a same-direction category (system QA 2026-07-19: an
  // expense row could be filed under an income category, poisoning the
  // donut and VAT treatment).
  const categoryOptionsByDirection = useMemo(
    () => ({
      expense: categoryOptions.filter(
        (option) => categoryTypeById.get(option.id) === "expense",
      ),
      income: categoryOptions.filter(
        (option) => categoryTypeById.get(option.id) === "income",
      ),
    }),
    [categoryOptions, categoryTypeById],
  );
  const categorySelectOptionsByDirection = useMemo(
    () => ({
      expense: categories
        .filter((cat) => cat.type === "expense")
        .map((cat) => ({ value: cat.id, label: cat.name })),
      income: categories
        .filter((cat) => cat.type === "income")
        .map((cat) => ({ value: cat.id, label: cat.name })),
    }),
    [categories],
  );
  // Bulk re-categorize applies one category — the selection must share a
  // direction for a typed category to fit every row.
  const selectedDirection = useMemo<
    "income" | "expense" | "mixed" | null
  >(() => {
    const directions = new Set(
      txns.items
        .filter((txn) => selected.has(txn.id))
        .map((txn) => txn.direction),
    );
    if (directions.size === 0) return null;
    return directions.size === 1 ? [...directions][0] : "mixed";
  }, [txns.items, selected]);

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
    link.download = `transactions-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${rows.length} transactions`);
  };

  // A stale pick (e.g. chosen, then cancelled, then the selection changed
  // to mixed) must never apply — Codex review on PR #209: the hidden
  // picker left Apply armed with the previous category.
  const bulkCategoryApplies =
    !!bulkCategory &&
    selectedDirection !== "mixed" &&
    selectedDirection !== null &&
    categoryTypeById.get(bulkCategory) === selectedDirection;

  const bulkRecategorize = async () => {
    if (!bulkCategoryApplies || !bulkCategory) return;
    const ids = [...selected];
    await Promise.all(
      ids.map((id) => txns.update(id, { category_id: bulkCategory })),
    );
    setBulkOpen(false);
    setBulkCategory(null);
    setSelected(new Set());
    setToast(`${ids.length} transactions re-categorized`);
  };

  // Bulk delete (Figma master 123:1126) — always behind the confirm.
  const bulkDelete = async () => {
    const ids = [...selected];
    setBulkDeleteOpen(false);
    await Promise.all(ids.map((id) => txns.remove(id)));
    setSelected(new Set());
    setToast(`${ids.length} transaction${ids.length === 1 ? "" : "s"} deleted`);
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

  /** B2b "Mark expected": clears the flags — the AI-trust affordance. */
  const markExpected = async () => {
    if (!activeTxn) return;
    setSaving(true);
    try {
      await txns.update(activeTxn.id, { anomalies: [] });
      setToast("Marked expected — this pattern won't be flagged again.");
      closeInspector();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Update failed");
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

  // Comparables come from the FULL ledger via the controller — the
  // deep-linked explain panel sits over an anomaly-only filtered list,
  // which would otherwise hide every clean comparable.
  const [comparableTxns, setComparableTxns] = useState<TxnEntry[]>([]);
  const activeTxnId = activeTxn?.id;
  const { fetchComparables } = txns;
  useEffect(() => {
    let cancelled = false;
    // Defer to a microtask — effects must not set state synchronously.
    if (inspector.kind !== "anomaly" || !activeTxn) {
      queueMicrotask(() => {
        if (!cancelled) setComparableTxns([]);
      });
    } else {
      void fetchComparables(activeTxn)
        .then((items) => {
          if (!cancelled) setComparableTxns(items);
        })
        .catch(() => {
          if (!cancelled) setComparableTxns([]);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspector.kind, activeTxnId, fetchComparables]);

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

      <TransactionFilters
        txns={txns}
        savedViews={savedViews}
        categorySelectOptions={categorySelectOptions}
        applyFilterPatch={applyFilterPatch}
        search={search}
        setSearch={setSearch}
        moreFilters={moreFilters}
        setMoreFilters={setMoreFilters}
        setSaveViewOpen={setSaveViewOpen}
      />

      <TransactionLedger
        txns={txns}
        density={density}
        isEmpty={isEmpty}
        router={router}
        sort={sort}
        setSort={setSort}
        selected={selected}
        setSelected={setSelected}
        sorted={sorted}
        tableRef={tableRef}
        onTableKeyDown={onTableKeyDown}
        allSelected={allSelected}
        someSelected={someSelected}
        categoryById={categoryById}
        categoryOptionsByDirection={categoryOptionsByDirection}
        openInspector={openInspector}
      />

      <TransactionBulkActions
        selected={selected}
        setSelected={setSelected}
        bulkCategoryApplies={bulkCategoryApplies}
        setBulkCategory={setBulkCategory}
        setBulkOpen={setBulkOpen}
        exportSelection={exportSelection}
        setBulkDeleteOpen={setBulkDeleteOpen}
        bulkDeleteOpen={bulkDeleteOpen}
        bulkDelete={bulkDelete}
        bulkOpen={bulkOpen}
        bulkRecategorize={bulkRecategorize}
        selectedDirection={selectedDirection}
        categorySelectOptionsByDirection={categorySelectOptionsByDirection}
        categorySelectOptions={categorySelectOptions}
        bulkCategory={bulkCategory}
      />

      <SaveTransactionViewModal
        saveViewOpen={saveViewOpen}
        setSaveViewOpen={setSaveViewOpen}
        viewName={viewName}
        setViewName={setViewName}
        savedViews={savedViews}
        txns={txns}
        search={search}
        setToast={setToast}
      />

      <TransactionInspector
        inspector={inspector}
        closeInspector={closeInspector}
        activeTxn={activeTxn}
        txns={txns}
        setToast={setToast}
        saving={saving}
        saveDraft={saveDraft}
        draft={draft}
        setDraft={setDraft}
        categoryTypeById={categoryTypeById}
        categorySelectOptionsByDirection={categorySelectOptionsByDirection}
        currency={currency}
        splitAmount={splitAmount}
        setSplitAmount={setSplitAmount}
        splitTxn={splitTxn}
        draftError={draftError}
      />

      <TransactionAnomalyInspector
        inspector={inspector}
        closeInspector={closeInspector}
        saving={saving}
        activeTxn={activeTxn}
        markExpected={markExpected}
        currency={currency}
        categoryById={categoryById}
        comparableTxns={comparableTxns}
      />

      <ToastLayer message={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default TransactionsView;
