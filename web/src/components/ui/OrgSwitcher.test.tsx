import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Org } from "@/models";
import OrgSwitcher from "./OrgSwitcher";

const orgs: Org[] = [
  {
    id: "org-p",
    name: "Ada (personal)",
    kind: "personal",
    currency: "NGN",
    country: "NG",
    fiscal_year_end: "12-31",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "org-c",
    name: "Bellafricana Ltd",
    kind: "company",
    currency: "NGN",
    country: "NG",
    fiscal_year_end: "12-31",
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("OrgSwitcher (design.md §8.2b)", () => {
  it("closed state shows the current org and its kind", () => {
    render(<OrgSwitcher orgs={orgs} currentOrgId="org-c" />);
    expect(screen.getByText("Bellafricana Ltd")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("data-kind", "company");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("open lists all orgs, marks current, and selects", async () => {
    const onSelect = vi.fn();
    render(
      <OrgSwitcher orgs={orgs} currentOrgId="org-c" onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole("button"));
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(
      screen.getByRole("option", { name: /Bellafricana/ }),
    ).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("option", { name: /Ada/ }));
    expect(onSelect).toHaveBeenCalledWith("org-p");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("personal kind renders on the trigger", () => {
    render(<OrgSwitcher orgs={orgs} currentOrgId="org-p" />);
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("compact trigger is icon-only with an aria label", () => {
    render(<OrgSwitcher orgs={orgs} currentOrgId="org-p" compact />);
    expect(
      screen.getByLabelText("Organization: Ada (personal)"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ada (personal)")).not.toBeInTheDocument();
  });
});
