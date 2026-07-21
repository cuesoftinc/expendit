import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RouteTabs from "./RouteTabs";

let pathname = "/dashboard/settings/organization";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

const TABS = [
  { href: "/dashboard/settings/organization", label: "Organization" },
  { href: "/dashboard/settings/members", label: "Members" },
  { href: "/dashboard/settings/data-privacy", label: "Data & privacy" },
];

const renderTabs = () =>
  render(
    <RouteTabs tabs={TABS} aria-label="Settings sections">
      <p>Pane content</p>
    </RouteTabs>,
  );

describe("RouteTabs (accessible routed-tabs pattern)", () => {
  beforeEach(() => {
    pathname = "/dashboard/settings/organization";
  });

  it("renders link tabs in a labelled tablist, marking the active route", () => {
    renderTabs();
    const list = screen.getByRole("tablist", { name: "Settings sections" });
    expect(list).toBeInTheDocument();

    const active = screen.getByRole("tab", { name: "Organization" });
    expect(active).toHaveAttribute("href", TABS[0].href);
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("tabindex", "0");

    const inactive = screen.getByRole("tab", { name: "Members" });
    expect(inactive).toHaveAttribute("aria-selected", "false");
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveAttribute("tabindex", "-1");
  });

  it("labels the tabpanel by the active tab and renders the pane", () => {
    renderTabs();
    const panel = screen.getByRole("tabpanel");
    const active = screen.getByRole("tab", { name: "Organization" });
    expect(panel).toHaveAttribute("aria-labelledby", active.id);
    expect(panel).toHaveTextContent("Pane content");
  });

  it("keeps the active tab marked on deeper sub-paths", () => {
    pathname = "/dashboard/settings/data-privacy/anything";
    renderTabs();
    expect(screen.getByRole("tab", { name: "Data & privacy" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("prefers the most specific tab when hrefs nest (categories Active/Archive)", () => {
    pathname = "/dashboard/categories/archive";
    render(
      <RouteTabs
        tabs={[
          { href: "/dashboard/categories", label: "Active" },
          { href: "/dashboard/categories/archive", label: "Archive" },
        ]}
        aria-label="Category registry views"
      >
        <p>Archive pane</p>
      </RouteTabs>,
    );
    expect(screen.getByRole("tab", { name: "Archive" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("moves focus with arrows/Home/End (manual activation, wrapping)", async () => {
    const user = userEvent.setup();
    renderTabs();
    const [org, members, privacy] = TABS.map((tab) =>
      screen.getByRole("tab", { name: tab.label }),
    );

    org.focus();
    await user.keyboard("{ArrowRight}");
    expect(members).toHaveFocus();
    await user.keyboard("{End}");
    expect(privacy).toHaveFocus();
    // wraps past the last tab
    await user.keyboard("{ArrowRight}");
    expect(org).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(privacy).toHaveFocus();
    await user.keyboard("{Home}");
    expect(org).toHaveFocus();
    // focus travel alone never navigates — the active tab is unchanged
    expect(org).toHaveAttribute("aria-current", "page");
  });
});
