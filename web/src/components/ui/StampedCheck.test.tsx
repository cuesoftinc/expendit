import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StampedCheck from "./StampedCheck";

describe("StampedCheck (design.md §8.2b, MI-10)", () => {
  it("renders the stamp with an accessible label", () => {
    render(<StampedCheck />);
    expect(screen.getByRole("img", { name: "Filed" })).toBeInTheDocument();
  });

  it("supports md/lg sizes", () => {
    const { rerender } = render(<StampedCheck size="md" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-size", "md");
    expect(screen.getByRole("img")).toHaveClass("h-10");
    rerender(<StampedCheck size="lg" />);
    expect(screen.getByRole("img")).toHaveClass("h-16");
  });

  it("stamp-in motion carries the reduced-motion fallback", () => {
    render(<StampedCheck />);
    expect(screen.getByRole("img")).toHaveClass("motion-reduce:animate-none");
  });
});
