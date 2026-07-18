import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressBar from "./ProgressBar";

describe("ProgressBar (design.md §8.2b, MI-9/MI-14)", () => {
  it("determinate mode reports value and sets the width", () => {
    render(<ProgressBar value={42} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "42%" });
  });

  it("indeterminate mode omits aria-valuenow and animates", () => {
    render(<ProgressBar />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuenow",
    );
    expect(screen.getByTestId("progress-fill")).toHaveClass("animate-pulse");
  });

  it("renders the label slot (live txn counter)", () => {
    render(<ProgressBar value={60} label="Synced 124 transactions" />);
    expect(screen.getByText("Synced 124 transactions")).toBeInTheDocument();
  });

  it("clamps out-of-range values", () => {
    render(<ProgressBar value={140} />);
    expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "100%" });
  });
});
