import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OrgKind } from "@/models";
import OverviewView from "./OverviewView";

const state = vi.hoisted(() => ({
  activeOrg: { currency: "NGN", kind: "personal" as OrgKind },
  loading: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/controllers", () => ({
  useOrg: () => ({ activeOrg: state.activeOrg, activeOrgId: "org-1" }),
  useOverviewController: () => ({
    flows: null,
    categoryTotals: null,
    anomalies: [],
    latest: [],
    estimates: [],
    loading: state.loading,
    error: null,
    loadCategoryTotals: vi.fn(),
  }),
}));

vi.mock("./OverviewLoading", () => ({
  OverviewLoading: ({ orgKind }: { orgKind: string | undefined }) => (
    <div data-testid="overview-loading">{orgKind ?? "missing"}</div>
  ),
}));

vi.mock("@/controllers/use-categories", () => ({
  useCategoriesController: () => ({ items: [] }),
}));

describe("OverviewView demo preview", () => {
  it("passes the active organization kind to the loading view", () => {
    state.loading = true;
    state.activeOrg = { currency: "NGN", kind: "company" };

    render(<OverviewView />);

    expect(screen.getByTestId("overview-loading")).toHaveTextContent("company");
    state.loading = false;
    state.activeOrg = { currency: "NGN", kind: "personal" };
  });

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
