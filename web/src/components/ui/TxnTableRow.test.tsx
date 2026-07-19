import { describe, expect, it, vi } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { TxnEntry } from "@/models";
import TxnTableRow from "./TxnTableRow";

const txn: TxnEntry = {
  id: "txn-1",
  org_id: "org-1",
  description: "Fuel — Lekki toll",
  amount: 18000,
  direction: "expense",
  category_id: "cat-1",
  txn_date: "2026-06-14",
  source: "csv",
  source_link_id: null,
  ai_categorized: true,
  excluded_from_reports: false,
  anomalies: [
    { rule_id: "large_transaction", severity: "warn", note: "3.2× median" },
  ],
  created_at: "2026-06-14T10:00:00Z",
};

const category = { id: "cat-1", name: "Transport", color: "#2456D6" };

// Real <tr> rows need a table context (semantic-HTML directive).
const InTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table>
    <tbody>{children}</tbody>
  </table>
);

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: InTable });

describe("TxnTableRow (design.md §8.2, MI-6)", () => {
  it("renders date, description, chip, money, anomaly, and source", () => {
    render(<TxnTableRow txn={txn} category={category} />);
    // Figma date column: short date ("14 Jun"), single line.
    expect(screen.getByText("14 Jun")).toBeInTheDocument();
    expect(screen.getByText("Fuel — Lekki toll")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("−₦18,000.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Large transaction (warn)" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("CSV import")).toBeInTheDocument();
  });

  it("MI-6: hover actions are absolutely positioned (no layout shift)", () => {
    render(<TxnTableRow txn={txn} category={category} />);
    const actions = screen.getByTestId("row-actions");
    expect(actions).toHaveClass("absolute", "opacity-0");
    expect(actions).toHaveClass("group-hover:opacity-100");
    // Adjudicated 2026-07-19: the cluster docks inside the DESCRIPTION
    // cell (right edge), so it never covers the amount column.
    const descriptionCell = screen.getByText(txn.description).closest("td");
    expect(descriptionCell).toContainElement(actions);
    expect(descriptionCell).toHaveClass("relative");
  });

  it("density switches row height 32/44", () => {
    const { rerender } = render(
      <TxnTableRow txn={txn} category={category} density="compact" />,
    );
    expect(screen.getByRole("row")).toHaveClass("h-[32px]");
    rerender(
      <TxnTableRow txn={txn} category={category} density="comfortable" />,
    );
    expect(screen.getByRole("row")).toHaveClass("h-[44px]");
  });

  it("selected and staged-duplicate states", () => {
    const { rerender } = render(
      <TxnTableRow txn={txn} category={category} selected />,
    );
    expect(screen.getByRole("row")).toHaveAttribute("data-state", "selected");
    rerender(<TxnTableRow txn={txn} category={category} stagedDuplicate />);
    expect(screen.getByRole("row")).toHaveAttribute(
      "data-state",
      "staged-duplicate",
    );
    // Figma staged-duplicate: warn-tinted row + inline Duplicate pill.
    expect(screen.getByRole("row")).toHaveClass("bg-warn/[0.08]");
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
  });

  it("keyboard: Enter opens, `e` edits (design.md §5)", async () => {
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    render(
      <TxnTableRow
        txn={txn}
        category={category}
        onOpen={onOpen}
        onEdit={onEdit}
      />,
    );
    const row = screen.getByRole("row");
    row.focus();
    await userEvent.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("e");
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("row action buttons fire their handlers", async () => {
    const onSplit = vi.fn();
    const onExclude = vi.fn();
    render(
      <TxnTableRow
        txn={txn}
        category={category}
        onSplit={onSplit}
        onExclude={onExclude}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Split" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Exclude from reports" }),
    );
    expect(onSplit).toHaveBeenCalled();
    expect(onExclude).toHaveBeenCalled();
  });
});
