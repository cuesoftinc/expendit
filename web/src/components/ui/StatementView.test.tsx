import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LineItem } from "@/models";
import StatementView from "./StatementView";

const item = (overrides: Partial<LineItem> & { id: string }): LineItem => ({
  statement_id: "st-1",
  canonical_key: null,
  source_label: "",
  amount: 0,
  status: "mapped",
  confidence: null,
  mapped_by: "ai",
  derived: false,
  ...overrides,
});

const lineItems: LineItem[] = [
  item({
    id: "li-1",
    canonical_key: "total_assets",
    source_label: "Total assets",
    amount: 5000000,
    confidence: 0.98,
  }),
  item({
    id: "li-2",
    canonical_key: "equity",
    source_label: "Equity",
    amount: 2000000,
    mapped_by: "user",
    derived: true,
  }),
];

describe("StatementView (design.md §8.2, Figma 98:743, B6)", () => {
  it("renders human line labels with the canonical key secondary in mono", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={lineItems}
      />,
    );
    expect(screen.getByText("Balance sheet")).toBeInTheDocument();
    expect(screen.getByText("2026-Q2")).toBeInTheDocument();
    // Human label primary, canonical key mono secondary.
    expect(screen.getByText("Total assets")).toBeInTheDocument();
    expect(screen.getByText("total_assets")).toHaveClass("font-mono");
    expect(screen.getByText("₦5,000,000.00")).toHaveClass("tabular-nums");
  });

  it("flags derived rows bold with the ƒ derived chip + formula affordance", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={lineItems}
        formulaNotes={{ equity: "share_capital + retained_earnings" }}
      />,
    );
    const chip = screen.getByRole("button", {
      name: "Derived — how we got this",
    });
    expect(chip).toHaveTextContent("ƒ derived");
    expect(document.querySelector('[data-derived="true"]')).not.toBeNull();
    expect(screen.getByText("Total equity")).toHaveClass("font-semibold");
  });

  it("shows the green identity-check footer when the balance sheet balances", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={[
          item({ id: "a", canonical_key: "total_assets", amount: 23_940_000 }),
          item({
            id: "l",
            canonical_key: "total_liabilities",
            amount: 5_100_000,
            derived: true,
          }),
          item({
            id: "e",
            canonical_key: "equity",
            amount: 18_840_000,
            derived: true,
          }),
        ]}
      />,
    );
    expect(
      screen.getByText("Assets = Liabilities + Equity"),
    ).toBeInTheDocument();
  });

  it("omits the identity footer when the identity does not hold", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={[
          item({ id: "a", canonical_key: "total_assets", amount: 23_940_000 }),
          item({
            id: "l",
            canonical_key: "total_liabilities",
            amount: 9_000_000,
          }),
          item({ id: "e", canonical_key: "equity", amount: 1_000_000 }),
        ]}
      />,
    );
    expect(screen.queryByText("Assets = Liabilities + Equity")).toBeNull();
  });

  it("counts parked rows in the unmapped tag and keeps them off the statement", () => {
    render(
      <StatementView
        kind="balance_sheet"
        period="2026-Q2"
        lineItems={[
          ...lineItems,
          item({
            id: "li-3",
            source_label: "Sundry balances",
            amount: 120_000,
            status: "unmapped",
          }),
        ]}
      />,
    );
    expect(screen.getByText("1 unmapped")).toBeInTheDocument();
    expect(screen.queryByText("Sundry balances")).toBeNull();
  });

  it("renders mapping-warning badges, period-selector and header-action slots", () => {
    render(
      <StatementView
        kind="income_statement"
        period="2026-H1"
        lineItems={[]}
        mappingWarnings={["identity check off by ₦12,000"]}
        periodSelector={<button>Change period</button>}
        headerActions={<button>Export to report</button>}
      />,
    );
    expect(
      screen.getByText("identity check off by ₦12,000"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change period" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export to report" }),
    ).toBeInTheDocument();
  });
});
