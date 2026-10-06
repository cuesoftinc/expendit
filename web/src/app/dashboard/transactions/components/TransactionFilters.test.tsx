import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import TransactionFilters from "./TransactionFilters";
import type { TxnFilters } from "@/models";
import type {
  useSavedViewsController,
  useTransactionsController,
} from "@/controllers";

type TxnsMock = ReturnType<typeof useTransactionsController>;
type SavedViewsMock = ReturnType<typeof useSavedViewsController>;

const mockSavedViews = {
  views: [
    {
      id: "view-1",
      org_id: "org-1",
      name: "High expenses",
      filters: { direction: "expense" as const, amount_min: 50000 },
      created_at: "2026-07-01",
    },
  ],
  saveView: vi.fn(),
  removeView: vi.fn(),
};

const makeMockTxns = (filters: TxnFilters = {}) => ({
  items: [],
  loading: false,
  error: null,
  filters,
  nextCursor: null,
  applyFilters: vi.fn(),
  loadMore: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  fetchComparables: vi.fn(),
});

const CATEGORY_OPTIONS = [
  { value: "cat-1", label: "Software" },
  { value: "cat-2", label: "Travel" },
];

describe("TransactionFilters (coupled design)", () => {
  it("renders the top toolbar controls with accessible labels", () => {
    const txns = makeMockTxns();
    render(
      <TransactionFilters
        txns={txns as unknown as TxnsMock}
        savedViews={mockSavedViews as unknown as SavedViewsMock}
        categorySelectOptions={CATEGORY_OPTIONS}
        applyFilterPatch={vi.fn()}
        search=""
        setSearch={vi.fn()}
        moreFilters={false}
        setMoreFilters={vi.fn()}
        setSaveViewOpen={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: "Filters" })).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Direction" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Income" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Expense" })).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Search transactions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "More filters" }),
    ).toBeInTheDocument();
  });

  it("changes direction and calls applyFilterPatch", async () => {
    const applyFilterPatch = vi.fn();
    const txns = makeMockTxns();
    render(
      <TransactionFilters
        txns={txns as unknown as TxnsMock}
        savedViews={mockSavedViews as unknown as SavedViewsMock}
        categorySelectOptions={CATEGORY_OPTIONS}
        applyFilterPatch={applyFilterPatch}
        search=""
        setSearch={vi.fn()}
        moreFilters={false}
        setMoreFilters={vi.fn()}
        setSaveViewOpen={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Expense" }));
    expect(applyFilterPatch).toHaveBeenCalledWith({ direction: "expense" });

    await userEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(applyFilterPatch).toHaveBeenCalledWith({ direction: undefined });
  });

  it("submits search and allows clearing search input", async () => {
    const applyFilterPatch = vi.fn();
    const setSearch = vi.fn();
    const txns = makeMockTxns();
    render(
      <TransactionFilters
        txns={txns as unknown as TxnsMock}
        savedViews={mockSavedViews as unknown as SavedViewsMock}
        categorySelectOptions={CATEGORY_OPTIONS}
        applyFilterPatch={applyFilterPatch}
        search="coffee"
        setSearch={setSearch}
        moreFilters={false}
        setMoreFilters={vi.fn()}
        setSaveViewOpen={vi.fn()}
      />,
    );

    const input = screen.getByRole("searchbox", {
      name: "Search transactions",
    });
    await userEvent.type(input, "{enter}");
    expect(applyFilterPatch).toHaveBeenCalledWith({ search: "coffee" });

    const clearSearchBtn = screen.getByRole("button", { name: "Clear search" });
    await userEvent.click(clearSearchBtn);
    expect(setSearch).toHaveBeenCalledWith("");
    expect(applyFilterPatch).toHaveBeenCalledWith({ search: undefined });
  });

  it("shows active filter badge count and opens More filters popover", async () => {
    const setMoreFilters = vi.fn();
    const txns = makeMockTxns({
      category_id: "cat-1",
      amount_min: 1000,
      anomaly_only: true,
    });
    render(
      <TransactionFilters
        txns={txns as unknown as TxnsMock}
        savedViews={mockSavedViews as unknown as SavedViewsMock}
        categorySelectOptions={CATEGORY_OPTIONS}
        applyFilterPatch={vi.fn()}
        search=""
        setSearch={vi.fn()}
        moreFilters={false}
        setMoreFilters={setMoreFilters}
        setSaveViewOpen={vi.fn()}
      />,
    );

    const moreBtn = screen.getByRole("button", { name: /More filters/ });
    expect(moreBtn).toHaveTextContent("3");

    await userEvent.click(moreBtn);
    expect(setMoreFilters).toHaveBeenCalled();
  });

  it("interacts with controls inside More filters popover", async () => {
    const applyFilterPatch = vi.fn();
    const setMoreFilters = vi.fn();
    const setSaveViewOpen = vi.fn();
    const txns = makeMockTxns();

    render(
      <TransactionFilters
        txns={txns as unknown as TxnsMock}
        savedViews={mockSavedViews as unknown as SavedViewsMock}
        categorySelectOptions={CATEGORY_OPTIONS}
        applyFilterPatch={applyFilterPatch}
        search=""
        setSearch={vi.fn()}
        moreFilters={true}
        setMoreFilters={setMoreFilters}
        setSaveViewOpen={setSaveViewOpen}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();

    // Min amount
    const minInput = screen.getByPlaceholderText("Min ₦");
    fireEvent.change(minInput, { target: { value: "500" } });
    expect(applyFilterPatch).toHaveBeenCalledWith({ amount_min: 500 });

    // Max amount
    const maxInput = screen.getByPlaceholderText("Max ₦");
    fireEvent.change(maxInput, { target: { value: "2000" } });
    expect(applyFilterPatch).toHaveBeenCalledWith({ amount_max: 2000 });

    // Anomalies only
    const anomaliesCheckbox = screen.getByRole("checkbox", {
      name: "Anomalies only",
    });
    await userEvent.click(anomaliesCheckbox);
    expect(applyFilterPatch).toHaveBeenCalledWith({ anomaly_only: true });

    // Category select
    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.click(screen.getByRole("option", { name: "Software" }));
    expect(applyFilterPatch).toHaveBeenCalledWith({ category_id: "cat-1" });

    // Source select
    await userEvent.click(screen.getByRole("combobox", { name: "Source" }));
    await userEvent.click(screen.getByRole("option", { name: "Bank" }));
    expect(applyFilterPatch).toHaveBeenCalledWith({ source: "bank" });

    // Saved views select
    await userEvent.click(
      screen.getByRole("combobox", { name: "Saved views" }),
    );
    await userEvent.click(
      screen.getByRole("option", { name: "High expenses" }),
    );
    expect(txns.applyFilters).toHaveBeenCalledWith({
      direction: "expense",
      amount_min: 50000,
    });

    // Save view button
    await userEvent.click(screen.getByRole("button", { name: "Save view" }));
    expect(setSaveViewOpen).toHaveBeenCalledWith(true);
    expect(setMoreFilters).toHaveBeenCalledWith(false);

    // Close button
    await userEvent.click(
      screen.getByRole("button", { name: "Close filters" }),
    );
    expect(setMoreFilters).toHaveBeenCalledWith(false);
  });

  it("shows Clear date range when date filters are active and clears on click", async () => {
    const applyFilterPatch = vi.fn();
    const txns = makeMockTxns({
      date_from: "2026-07-01",
      date_to: "2026-07-20",
    });

    render(
      <TransactionFilters
        txns={txns as unknown as TxnsMock}
        savedViews={mockSavedViews as unknown as SavedViewsMock}
        categorySelectOptions={CATEGORY_OPTIONS}
        applyFilterPatch={applyFilterPatch}
        search=""
        setSearch={vi.fn()}
        moreFilters={true}
        setMoreFilters={vi.fn()}
        setSaveViewOpen={vi.fn()}
      />,
    );

    // Find and click the footer "Clear date range" button
    const clearDateBtns = screen.getAllByRole("button", {
      name: "Clear date range",
    });
    expect(clearDateBtns.length).toBeGreaterThanOrEqual(1);
    await userEvent.click(clearDateBtns[0]);
    expect(applyFilterPatch).toHaveBeenCalledWith({
      date_from: undefined,
      date_to: undefined,
    });
  });

  it("closes More filters popover on Escape key", async () => {
    const setMoreFilters = vi.fn();
    const txns = makeMockTxns();

    render(
      <TransactionFilters
        txns={txns as unknown as TxnsMock}
        savedViews={mockSavedViews as unknown as SavedViewsMock}
        categorySelectOptions={CATEGORY_OPTIONS}
        applyFilterPatch={vi.fn()}
        search=""
        setSearch={vi.fn()}
        moreFilters={true}
        setMoreFilters={setMoreFilters}
        setSaveViewOpen={vi.fn()}
      />,
    );

    await userEvent.keyboard("{Escape}");
    expect(setMoreFilters).toHaveBeenCalledWith(false);
  });
});
