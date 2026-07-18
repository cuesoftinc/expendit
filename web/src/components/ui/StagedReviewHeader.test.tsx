import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StagedReviewHeader from "./StagedReviewHeader";

describe("StagedReviewHeader (design.md §8.2b, MI-3)", () => {
  it("confirm button carries the MI-3 counts", async () => {
    const onCommit = vi.fn();
    render(
      <StagedReviewHeader
        importCount={209}
        duplicateCount={5}
        onCommit={onCommit}
      />,
    );
    const commit = screen.getByRole("button", {
      name: "Import 209, discard 5 duplicates",
    });
    expect(commit).toHaveTextContent("Import 209 / discard 5 duplicates");
    await userEvent.click(commit);
    expect(onCommit).toHaveBeenCalled();
  });

  it("no-duplicates copy drops the discard clause", () => {
    render(<StagedReviewHeader importCount={42} duplicateCount={0} />);
    expect(screen.getByText("Import 42")).toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: /Import 209, discard/ }),
    ).toBeDisabled();
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
