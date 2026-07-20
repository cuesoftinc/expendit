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
    canonical_key: "equity",
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
    // Human reading labels, not raw canonical keys (Figma 98:743).
    expect(screen.getByText("Total assets")).toBeInTheDocument();
    expect(screen.queryByText("total_assets")).not.toBeInTheDocument();
    expect(screen.getByText("₦5,000,000.00")).toHaveClass("tabular-nums");
  });

  it("flags derived rows with the ƒ derived chip (formula tooltip)", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={lineItems}
        formulaNotes={{ equity: "total_assets − total_liabilities" }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "ƒ derived" }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-derived="true"]')).not.toBeNull();
  });

  it("renders the identity-check footer when the statement ties out", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={[
          ...lineItems,
          {
            id: "li-3",
            statement_id: "st-1",
            canonical_key: "total_liabilities",
            source_label: "Total liabilities",
            amount: 3000000,
            status: "mapped",
            confidence: 0.97,
            mapped_by: "ai",
            derived: false,
          },
        ]}
      />,
    );
    const footer = document.querySelector('[data-identity="pass"]');
    expect(footer).not.toBeNull();
    expect(footer).toHaveTextContent(
      "Identity check — Assets = Liabilities + Equity",
    );
  });

  it("counts unmapped rows in the header tag and tags the row", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={[
          ...lineItems,
          {
            id: "li-4",
            statement_id: "st-1",
            canonical_key: null,
            source_label: "Sundry accruals",
            amount: 120000,
            status: "unmapped",
            confidence: 0.4,
            mapped_by: "ai",
            derived: false,
          },
        ]}
      />,
    );
    expect(screen.getByText("1 unmapped")).toBeInTheDocument();
    expect(screen.getByText("Sundry accruals")).toBeInTheDocument();
    expect(screen.getByText("unmapped")).toBeInTheDocument();
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
