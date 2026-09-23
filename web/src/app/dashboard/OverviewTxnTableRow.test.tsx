import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import type { TxnEntry } from "@/models";
import OverviewTxnTableRow from "./OverviewTxnTableRow";

const category = { id: "cat-1", name: "Transport", color: "#2456D6" };

const txn: TxnEntry = {
  id: "txn-1",
  org_id: "org-1",
  description: "Fuel — Lekki toll",
  amount: 18000,
  direction: "expense",
  category_id: category.id,
  txn_date: "2026-07-15T19:00:00",
  source: "csv",
  source_link_id: null,
  ai_categorized: false,
  excluded_from_reports: false,
  anomalies: [],
  created_at: "2026-07-15T19:00:00Z",
};

const InTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table>
    <tbody>{children}</tbody>
  </table>
);

describe("OverviewTxnTableRow", () => {
  it("keeps the fixed overview column order when there is no signal", () => {
    const { container } = render(
      <OverviewTxnTableRow txn={txn} category={category} />,
      { wrapper: InTable },
    );

    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(6);
    expect(cells[0]).toHaveTextContent("15-07-2026 • 07:00 PM");
    expect(cells[1]).toContainElement(screen.getByLabelText("CSV import"));
    expect(cells[2]).toHaveTextContent(txn.description);
    expect(cells[3]).toHaveTextContent(category.name);
    expect(cells[4]).toBeEmptyDOMElement();
    expect(cells[5]).toHaveTextContent("−₦18,000.00");
  });

  it("uses the dedicated Signals cell for anomaly badges", () => {
    render(
      <OverviewTxnTableRow
        txn={{
          ...txn,
          anomalies: [
            {
              rule_id: "duplicate_charge",
              severity: "warn",
              note: "Same merchant and amount.",
            },
          ],
        }}
        category={category}
      />,
      { wrapper: InTable },
    );

    expect(screen.getAllByRole("cell")[4]).toHaveTextContent("Duplicate");
  });
});
