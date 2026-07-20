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

  it("completed shows the Figma caption + status tag", () => {
    render(<ImportJobRow job={job()} />);
    expect(
      screen.getByText("209 transactions · 5 duplicates · 1 anomaly found"),
    ).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("processing renders the parsing caption + info tag", () => {
    render(<ImportJobRow job={job({ status: "processing" })} />);
    expect(screen.getByText("Parsing…")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("failed renders the human taxonomy line; the raw code rides the tooltip", () => {
    render(
      <ImportJobRow
        job={job({ status: "failed", error_code: "password_protected_pdf" })}
      />,
    );
    const line = screen.getByText("Remove the password and re-upload.");
    expect(line).toBeInTheDocument();
    expect(line).toHaveAttribute("title", "password_protected_pdf");
    expect(screen.queryByText("password_protected_pdf")).toBeNull();
  });

  it("parked staged jobs tag blue 'Ready for review' with a relative age", () => {
    render(
      <ImportJobRow
        job={job({
          confirmed: false,
          imported: 0,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        })}
      />,
    );
    expect(screen.getByText("Ready for review")).toBeInTheDocument();
    expect(
      screen.getByText("214 staged for review · 5 duplicates flagged"),
    ).toBeInTheDocument();
    expect(screen.getByText("2h ago")).toBeInTheDocument();
  });

  it("completed-empty and completed-bank variants", () => {
    const { rerender } = render(
      <ImportJobRow
        job={job({ total_parsed: 0, imported: 0, anomalies: [] })}
      />,
    );
    expect(
      screen.getByText("0 transactions found — check file contents"),
    ).toBeInTheDocument();
    expect(screen.getByText("Empty")).toBeInTheDocument();
    rerender(
      <ImportJobRow job={job({ source: "bank_sync", file_name: null })} />,
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-status",
      "completed-bank",
    );
    expect(screen.getByText("Bank sync")).toBeInTheDocument();
    expect(
      screen.getByText("209 transactions · auto-confirmed"),
    ).toBeInTheDocument();
  });
});
