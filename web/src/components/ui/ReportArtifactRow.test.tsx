import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReportArtifact } from "@/models";
import ReportArtifactRow from "./ReportArtifactRow";

const artifact = (
  overrides: Partial<ReportArtifact> = {},
): ReportArtifact => ({
  id: "ra-1",
  org_id: "org-1",
  kind: "monthly_summary",
  format: "pdf",
  period: "2026-06",
  params: {},
  status: "ready",
  signed_url: "https://example.test/report.pdf",
  created_at: "2026-07-01T09:00:00Z",
  expires_at: "2026-07-31T09:00:00Z",
  ...overrides,
});

describe("ReportArtifactRow (design.md §8.2b, MI-14)", () => {
  it("ready renders kind, period, format + download", async () => {
    const onDownload = vi.fn();
    render(<ReportArtifactRow artifact={artifact()} onDownload={onDownload} />);
    expect(screen.getByText("Monthly summary")).toBeInTheDocument();
    expect(screen.getByText("2026-06")).toBeInTheDocument();
    expect(screen.getByText("pdf")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Download Monthly summary" }),
    );
    expect(onDownload).toHaveBeenCalled();
    expect(screen.getByRole("row")).toHaveAttribute("data-state", "ready");
  });

  it("NEW tag renders for ≤24h artifacts (MI-14)", () => {
    render(<ReportArtifactRow artifact={artifact()} isNew />);
    expect(screen.getByText("NEW")).toHaveAttribute("data-tint", "new-accent");
    expect(screen.getByRole("row")).toHaveAttribute("data-state", "new");
  });

  it("generating shows inline progress, no download", () => {
    render(<ReportArtifactRow artifact={artifact({ status: "generating" })} />);
    expect(screen.getByTestId("artifact-progress")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("expired dims the row and drops the download", () => {
    render(<ReportArtifactRow artifact={artifact({ status: "expired" })} />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByRole("row")).toHaveClass("opacity-60");
  });
});
