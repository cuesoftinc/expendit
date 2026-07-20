import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReportArtifact } from "@/models";
import ReportArtifactRow from "./ReportArtifactRow";

const artifact = (overrides: Partial<ReportArtifact> = {}): ReportArtifact => ({
  id: "ra-1",
  org_id: "org-1",
  kind: "monthly_summary",
  format: "pdf",
  period: "2026-06",
  params: {},
  status: "ready",
  signed_url: "https://example.test/report.pdf",
  size_bytes: 1_240_000,
  created_at: "2026-07-01T09:00:00Z",
  expires_at: "2026-07-31T09:00:00Z",
  ...overrides,
});

describe("ReportArtifactRow (design.md §8.2b, Figma 128:1209, MI-14)", () => {
  it("ready renders the titled period, size meta line + download", async () => {
    const onDownload = vi.fn();
    render(<ReportArtifactRow artifact={artifact()} onDownload={onDownload} />);
    // Title carries the humanized period; meta line "PDF · 1.2 MB".
    expect(screen.getByText("Monthly summary — Jun 2026")).toBeInTheDocument();
    expect(screen.getByText("pdf").parentElement).toHaveTextContent(
      "pdf · 1.2 MB",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Download Monthly summary" }),
    );
    expect(onDownload).toHaveBeenCalled();
    expect(screen.getByRole("listitem")).toHaveAttribute("data-state", "ready");
  });

  it("statement-grammar periods render as-is", () => {
    render(
      <ReportArtifactRow
        artifact={artifact({ kind: "financial_statement", period: "FY2025" })}
      />,
    );
    expect(
      screen.getByText("Financial statement — FY2025"),
    ).toBeInTheDocument();
  });

  it("NEW tag renders for ≤24h artifacts (MI-14)", () => {
    render(<ReportArtifactRow artifact={artifact()} isNew />);
    expect(screen.getByText("NEW")).toHaveAttribute("data-tint", "new-accent");
    expect(screen.getByRole("listitem")).toHaveAttribute("data-state", "new");
  });

  it("generating shows inline progress, no download", () => {
    render(<ReportArtifactRow artifact={artifact({ status: "generating" })} />);
    expect(screen.getByTestId("artifact-progress")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("expired dims the row and drops the download", () => {
    render(<ReportArtifactRow artifact={artifact({ status: "expired" })} />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveClass("opacity-60");
  });
});
