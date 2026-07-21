/**
 * B8b Archive tab view states (design.md §8.1): loading skeleton, empty
 * copy, populated rows with the absolute-date meta and a quiet
 * Unarchive, and the error banner. The controller is mocked — views
 * render only.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category } from "@/models";
import CategoriesArchiveView from "./CategoriesArchiveView";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/categories/archive",
}));

const unarchive = vi.fn();
const controller = {
  items: [] as Category[],
  loading: false,
  error: null as string | null,
  unarchive,
};

vi.mock("@/controllers", () => ({
  useOrg: () => ({ activeOrgId: "org-x" }),
  useCategoriesController: (
    _orgId?: string,
    options?: { archived?: boolean },
  ) => {
    // The archive view must ask for the archived registry.
    expect(options?.archived).toBe(true);
    return controller;
  },
}));

const archivedCategory: Category = {
  id: "cat-conferences",
  org_id: "org-x",
  name: "Conferences & travel",
  type: "expense",
  color: "#6E4BD6",
  tax_treatment: "ignore",
  vat_treatment: "exempt",
  vat_basis: "inclusive",
  txn_count_ytd: 0,
  archived_at: "2026-03-14T09:30:00.000Z",
};

describe("CategoriesArchiveView (B8b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.items = [];
    controller.loading = false;
    controller.error = null;
  });

  it("renders the routed tab bar with Archive selected", () => {
    render(<CategoriesArchiveView />);
    const archiveTab = screen.getByRole("tab", { name: "Archive" });
    expect(archiveTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute(
      "href",
      "/dashboard/categories",
    );
  });

  it("shows the loading skeleton before the first page of data", () => {
    controller.loading = true;
    render(<CategoriesArchiveView />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
  });

  it("explains the empty archive", () => {
    render(<CategoriesArchiveView />);
    expect(
      screen.getByText(/Nothing archived yet — archiving hides a category/),
    ).toBeInTheDocument();
  });

  it("renders archived rows with absolute-date meta and a quiet Unarchive", async () => {
    controller.items = [archivedCategory];
    unarchive.mockResolvedValue({ ...archivedCategory, archived_at: null });
    render(<CategoriesArchiveView />);

    expect(screen.getByText("Conferences & travel")).toBeInTheDocument();
    // Finance idiom: absolute date, never relative phrasing.
    expect(
      screen.getByText("Archived 14 Mar 2026 · 0 transactions this year"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Unarchive" }));
    expect(unarchive).toHaveBeenCalledWith("cat-conferences");
    expect(
      await screen.findByText(
        '"Conferences & travel" restored to the active registry',
      ),
    ).toBeInTheDocument();
  });

  it("surfaces controller errors in a banner", () => {
    controller.error = "Failed to load categories";
    render(<CategoriesArchiveView />);
    expect(screen.getByText("Failed to load categories")).toBeInTheDocument();
  });
});
