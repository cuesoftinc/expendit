import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ImportJob } from "@/models";
import ImportJobRow, { rowStatus } from "./ImportJobRow";

const job = (overrides: Partial<ImportJob> = {}): ImportJob => ({
  id: "job-1",
  org_id: "org-1",
  source: "upload",
  status: "completed",
  file_name: "june.csv",
  file_type: "csv",
  total_parsed: 214,
  duplicates_found: 5,
  imported: 209,
  summary: null,
  ai_summary: null,
  anomalies: [
    { rule_id: "duplicate_charge", severity: "info", note: "2 candidates" },
  ],
  warnings: [],
  error_code: null,
  confirmed: true,
  created_at: "2026-07-01T09:00:00Z",
  completed_at: "2026-07-01T09:01:00Z",
  ...overrides,
});

describe("ImportJobRow (design.md §8.2b)", () => {
  it("folds source into status per the as-built note", () => {
    expect(rowStatus(job())).toBe("completed");
    expect(rowStatus(job({ status: "processing" }))).toBe("processing");
    expect(rowStatus(job({ status: "failed" }))).toBe("failed");
    expect(rowStatus(job({ source: "bank_sync" }))).toBe("completed-bank");
    expect(rowStatus(job({ total_parsed: 0, imported: 0 }))).toBe(
      "completed-empty",
    );
  });

  it("completed shows counts + anomalies found", () => {
    render(<ImportJobRow job={job()} />);
    expect(screen.getByText("209/214 imported")).toBeInTheDocument();
    expect(screen.getByText("5 duplicates")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // anomaly count tag
  });

  it("processing renders the spinner copy", () => {
    render(<ImportJobRow job={job({ status: "processing" })} />);
    expect(screen.getByText("Processing…")).toBeInTheDocument();
  });

  it("failed renders the taxonomy code", () => {
    render(
      <ImportJobRow
        job={job({ status: "failed", error_code: "unreadable_file" })}
      />,
    );
    expect(screen.getByText("unreadable_file")).toBeInTheDocument();
  });

  it("completed-empty and completed-bank variants", () => {
    const { rerender } = render(
      <ImportJobRow
        job={job({ total_parsed: 0, imported: 0, anomalies: [] })}
      />,
    );
    expect(screen.getByText("No transactions found")).toBeInTheDocument();
    rerender(
      <ImportJobRow job={job({ source: "bank_sync", file_name: null })} />,
    );
    expect(screen.getByRole("row")).toHaveAttribute(
      "data-status",
      "completed-bank",
    );
    expect(screen.getByText("bank")).toBeInTheDocument();
  });
});
