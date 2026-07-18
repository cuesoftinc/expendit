import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Skeleton from "./Skeleton";

describe("Skeleton (design.md §8.2b, MI-12)", () => {
  it("row variant honors density row heights", () => {
    const { rerender } = render(<Skeleton variant="row" density="compact" />);
    expect(screen.getByTestId("skeleton-row")).toHaveClass("h-[32px]");
    rerender(<Skeleton variant="row" density="comfortable" />);
    expect(screen.getByTestId("skeleton-row")).toHaveClass("h-[44px]");
  });

  it("chart variant renders axis-first (MI-12)", () => {
    render(<Skeleton variant="chart" />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
  });

  it("stat and text variants shimmer with reduced-motion fallback", () => {
    render(<Skeleton variant="stat" />);
    expect(screen.getByTestId("skeleton-stat")).toBeInTheDocument();
    render(<Skeleton variant="text" />);
    expect(screen.getByTestId("skeleton-text")).toHaveClass(
      "motion-reduce:animate-none",
    );
  });
});
