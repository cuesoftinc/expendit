import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OverviewView from "./OverviewView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/controllers", () => ({
  useOrg: () => ({ activeOrg: { currency: "NGN" }, activeOrgId: "org-1" }),
  useOverviewController: () => ({
    flows: null,
    categoryTotals: null,
    anomalies: [],
    latest: [],
    estimates: [],
    loading: false,
    error: null,
    loadCategoryTotals: vi.fn(),
  }),
}));

vi.mock("@/controllers/use-categories", () => ({
  useCategoriesController: () => ({ items: [] }),
}));

describe("OverviewView demo preview", () => {
  it("shows the five sample transactions when demo data is enabled", async () => {
    const user = userEvent.setup();
    render(<OverviewView />);

    expect(
      screen.queryByRole("heading", { name: "Latest transactions" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("switch", { name: "Preview with demo data" }),
    );

    expect(
      screen.getByRole("heading", { name: "Latest transactions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Demo transactions" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(6);
    expect(screen.getByText("MTN — data bundle top-up")).toBeInTheDocument();
    expect(screen.getByText("Bolt — client meetings")).toBeInTheDocument();
  });
});
