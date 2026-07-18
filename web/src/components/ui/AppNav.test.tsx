import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutDashboard, ArrowLeftRight } from "lucide-react";
import AppNav, { NavGroupLabel, NavItem } from "./AppNav";

const nav = (collapsed: boolean, onCollapsedChange = vi.fn()) => (
  <AppNav
    collapsed={collapsed}
    onCollapsedChange={onCollapsedChange}
    orgSwitcher={<div data-testid="org-slot" />}
  >
    <NavGroupLabel>Workspace</NavGroupLabel>
    <NavItem icon={LayoutDashboard} label="Overview" active />
    <NavItem
      icon={ArrowLeftRight}
      label="Transactions"
      badgeCount={3}
      href="/dashboard/transactions"
    />
  </AppNav>
);

describe("AppNav / NavItem (design.md §8.2b)", () => {
  it("renders group label, items, active state, and org-switcher slot", () => {
    render(nav(false));
    expect(screen.getByRole("navigation", { name: "Primary" })).toHaveClass(
      "w-60",
    );
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Overview/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("org-slot")).toBeInTheDocument();
  });

  it("MI-5: badge count renders on the item", () => {
    render(nav(false));
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("collapsed rail is 64px, icon-only with aria labels", () => {
    render(nav(true));
    expect(screen.getByRole("navigation", { name: "Primary" })).toHaveClass(
      "w-16",
    );
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Transactions")).toBeInTheDocument();
  });

  it("collapse toggle flips the state", async () => {
    const onCollapsedChange = vi.fn();
    render(nav(false, onCollapsedChange));
    await userEvent.click(
      screen.getByRole("button", { name: "Collapse navigation" }),
    );
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("NavItem with href renders a link", () => {
    render(nav(false));
    expect(screen.getByRole("link", { name: /Transactions/ })).toHaveAttribute(
      "href",
      "/dashboard/transactions",
    );
  });
});
