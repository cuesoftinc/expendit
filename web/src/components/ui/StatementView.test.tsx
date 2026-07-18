import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LineItem } from "@/models";
import StatementView from "./StatementView";

const lineItems: LineItem[] = [
  {
    id: "li-1",
    statement_id: "st-1",
    canonical_key: "total_assets",
    source_label: "Total assets",
    amount: 5000000,
    status: "mapped",
    confidence: 0.98,
    mapped_by: "ai",
    derived: false,
  },
  {
    id: "li-2",
    statement_id: "st-1",
    canonical_key: "total_equity",
    source_label: "Equity",
    amount: 2000000,
    status: "mapped",
    confidence: null,
    mapped_by: "user",
    derived: true,
  },
];

describe("StatementView (design.md §8.2, B6)", () => {
  it("renders the kind header, period, and line items", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={lineItems}
      />,
    );
    expect(screen.getByText("Balance sheet")).toBeInTheDocument();
    expect(screen.getByText("2026-Q2")).toBeInTheDocument();
    expect(screen.getByText("total_assets")).toBeInTheDocument();
    expect(screen.getByText("₦5,000,000.00")).toHaveClass("tabular-nums");
  });

  it("flags derived rows with the formula affordance", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={lineItems}
        formulaNotes={{ total_equity: "total_assets − total_liabilities" }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Derived — how we got this" }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-derived="true"]')).not.toBeNull();
  });

  it("renders mapping-warning badges and the period-selector slot", () => {
    render(
      <StatementView
        kind="income_statement"
        period="2026-H1"
        lineItems={[]}
        mappingWarnings={["identity check off by ₦12,000"]}
        periodSelector={<button>Change period</button>}
      />,
    );
    expect(
      screen.getByText("identity check off by ₦12,000"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change period" }),
    ).toBeInTheDocument();
  });
});
