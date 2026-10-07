import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverviewLoading } from "./OverviewLoading";

vi.mock("@/components/ui/StatCard", () => ({
  default: () => <div data-testid="loading-stat" />,
}));

describe("OverviewLoading", () => {
  it("reserves three stat slots for personal organizations", () => {
    const { container } = render(<OverviewLoading orgKind="personal" />);

    expect(screen.getAllByTestId("loading-stat")).toHaveLength(3);
    expect(container.querySelector(".lg\\:grid-cols-3")).toBeInTheDocument();
  });

  it("reserves four stat slots for company organizations", () => {
    const { container } = render(<OverviewLoading orgKind="company" />);

    expect(screen.getAllByTestId("loading-stat")).toHaveLength(4);
    expect(container.querySelector(".lg\\:grid-cols-4")).toBeInTheDocument();
  });
});
