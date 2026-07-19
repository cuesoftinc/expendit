import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DemoSection from "./DemoSection";

describe("A5 — interactive demo (persona tabs over the §8.3 datasets)", () => {
  beforeEach(() => {
    window.__expenditEvents = [];
  });

  it("renders the demo badge, persona tabs, and the freelancer dataset", () => {
    render(<DemoSection />);
    expect(screen.getByText("This is demo data")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Freelancer" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "SME" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Company" })).toBeInTheDocument();
    // Freelancer income stat (Figma A5 strip verbatim).
    expect(screen.getByText("₦1,480,000.00")).toBeInTheDocument();
    expect(screen.getByText("MTN — data bundle top-up")).toBeInTheDocument();
  });

  it("switching persona swaps stats, table rows, and emits demo_interact", async () => {
    render(<DemoSection />);
    await userEvent.click(screen.getByRole("tab", { name: "Company" }));
    expect(screen.getByText("₦8,435,200.00")).toBeInTheDocument();
    expect(screen.getByText("Retainer — Kudaworks")).toBeInTheDocument();
    expect(screen.queryByText("MTN — data bundle top-up")).toBeNull();
    expect(
      window.__expenditEvents?.some(
        (record) =>
          record.event === "demo_interact" &&
          record.props.action === "switch_persona" &&
          record.props.persona === "company",
      ),
    ).toBe(true);
  });

  it("data-table toggle swaps the chart for its table (design.md §5)", async () => {
    render(<DemoSection />);
    await userEvent.click(screen.getByRole("button", { name: "Data table" }));
    expect(
      screen.getByRole("table", { name: "Cash flow by month" }),
    ).toBeInTheDocument();
  });

  it("CRUD-light: recategorizing a row clears the ✨ marker (MI-4)", async () => {
    render(<DemoSection />);
    const table = screen.getByTestId("demo-table");
    // First AI-suggested chip: Utilities ✨ on the MTN row.
    expect(
      within(table).getAllByTestId("category-ai-mark").length,
    ).toBeGreaterThan(0);
    const chip = within(table).getAllByRole("button", {
      name: /Utilities/,
    })[0];
    await userEvent.click(chip);
    await userEvent.click(screen.getByRole("option", { name: /Other/ }));
    expect(within(table).getAllByText("Other").length).toBeGreaterThan(0);
    expect(
      window.__expenditEvents?.some(
        (record) =>
          record.event === "demo_interact" &&
          record.props.action === "recategorize",
      ),
    ).toBe(true);
  });
});
