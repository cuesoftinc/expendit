import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TxnEntry } from "@/models";
import { OverviewSidePanels } from "./OverviewSidePanels";

const anomalyTypes: TxnEntry["anomalies"][number]["rule_id"][] = [
  "large_transaction",
  "spending_spike",
  "abnormal_category",
  "duplicate_charge",
];

const anomalies: TxnEntry[] = anomalyTypes.map((rule_id, index) => ({
  id: `txn-${index + 1}`,
  org_id: "org-1",
  description: `Anomalous transaction ${index + 1}`,
  amount: 48_000 + index,
  direction: "expense",
  category_id: "equipment",
  txn_date: "2026-09-22",
  source: "bank",
  source_link_id: null,
  ai_categorized: false,
  excluded_from_reports: false,
  anomalies: [{ rule_id, severity: "warn", note: "Requires review." }],
  created_at: "2026-09-22T18:45:00Z",
}));

describe("OverviewSidePanels anomalies", () => {
  it("shows three anomaly rows with amounts and timestamps", async () => {
    const user = userEvent.setup();
    const onExplainAnomaly = vi.fn();
    render(
      <OverviewSidePanels
        categoryTotals={null}
        categoryById={new Map()}
        anomalies={anomalies}
        currency="NGN"
        onExplainAnomaly={onExplainAnomaly}
      />,
    );

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /transaction/i }),
    ).toHaveLength(3);
    expect(screen.getByText("₦48,000.00")).toBeInTheDocument();
    expect(screen.getAllByText("22 September 2026")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /transaction 3/i }));
    expect(onExplainAnomaly).toHaveBeenCalledWith("txn-3");
    expect(
      screen.getByRole("link", { name: "Explain in ledger →" }),
    ).toHaveAttribute("href", "/dashboard/transactions?anomalies=1");
  });
});
