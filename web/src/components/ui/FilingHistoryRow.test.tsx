import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TaxFiling } from "@/models";
import FilingHistoryRow from "./FilingHistoryRow";

const filing = (overrides: Partial<TaxFiling> = {}): TaxFiling => ({
  id: "tf-1",
  org_id: "org-1",
  kind: "pit",
  period: "FY2026",
  status: "accepted",
  amount_due: 342500,
  due_date: "2027-03-31",
  computed_fields: [],
  authority: {
    code: "LIRS",
    name: "Lagos State Internal Revenue Service",
    payment_channels: [],
  },
  artifact_key: "receipts/tf-1.pdf",
  filed_at: "2027-01-15T10:00:00Z",
  created_at: "2027-01-15T09:00:00Z",
  ...overrides,
});

describe("FilingHistoryRow (design.md §8.2b, MI-10)", () => {
  it("renders the Figma title, caption, and amount", () => {
    render(<FilingHistoryRow filing={filing()} />);
    // "PIT · FY2026" title; "LIRS · Filed 15 Jan 2027" caption.
    expect(screen.getByText("pit")).toBeInTheDocument();
    expect(screen.getByText(/· FY2026/)).toBeInTheDocument();
    expect(screen.getByText(/LIRS · Filed 15 Jan 2027/)).toBeInTheDocument();
    expect(screen.getByText("₦342,500.00")).toHaveClass("tabular-nums");
  });

  it("accepted filing carries the stamped-✓ and Receipt download", async () => {
    const onDownloadReceipt = vi.fn();
    render(
      <FilingHistoryRow
        filing={filing()}
        onDownloadReceipt={onDownloadReceipt}
      />,
    );
    expect(screen.getByRole("img", { name: "pit filed" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Receipt/ }));
    expect(onDownloadReceipt).toHaveBeenCalled();
  });

  it("draft filings render status text without stamp or download", () => {
    render(
      <FilingHistoryRow
        filing={filing({ status: "draft", artifact_key: null })}
      />,
    );
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
