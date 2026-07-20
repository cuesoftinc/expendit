import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StagedReviewHeader from "./StagedReviewHeader";

describe("StagedReviewHeader (design.md §8.2b, MI-3)", () => {
  it("splits the CTAs per the B3b frame — Import N primary, Discard N duplicates secondary", async () => {
    const onCommit = vi.fn();
    const onDiscardDuplicates = vi.fn();
    render(
      <StagedReviewHeader
        importCount={209}
        duplicateCount={5}
        onCommit={onCommit}
        onDiscardDuplicates={onDiscardDuplicates}
      />,
    );
    const commit = screen.getByRole("button", { name: "Import 209" });
    await userEvent.click(commit);
    expect(onCommit).toHaveBeenCalled();
    const discard = screen.getByRole("button", {
      name: "Discard 5 duplicates",
    });
    await userEvent.click(discard);
    expect(onDiscardDuplicates).toHaveBeenCalled();
  });

  it("no-duplicates state drops the discard affordance", () => {
    render(<StagedReviewHeader importCount={42} duplicateCount={0} />);
    expect(screen.getByText("Import 42")).toBeInTheDocument();
    expect(screen.queryByText(/Discard/)).not.toBeInTheDocument();
  });

  it("committing state disables and shows progress copy", () => {
    render(
      <StagedReviewHeader
        importCount={209}
        duplicateCount={5}
        state="committing"
      />,
    );
    expect(screen.getByText("Committing…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Committing/ })).toBeDisabled();
  });

  it("renders the warnings-banner slot", () => {
    render(
      <StagedReviewHeader
        importCount={10}
        duplicateCount={0}
        warnings={<div role="status">3 rows partially extracted</div>}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "3 rows partially extracted",
    );
  });
});
