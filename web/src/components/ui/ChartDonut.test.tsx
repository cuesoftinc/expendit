import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ChartDonut from "./ChartDonut";

const slices = [
  { id: "transport", label: "Transport", value: 40, color: "#2456D6" },
  { id: "food", label: "Food", value: 60, color: "#1B7F4B" },
];

describe("Chart/Donut (design.md §8.2b)", () => {
  it("data state renders slices with registry colors + center total", () => {
    render(
      <ChartDonut
        slices={slices}
        centerTotal="₦100k"
        centerCaption="June"
        legend="right"
      />,
    );
    expect(screen.getByTestId("donut-slice-transport")).toHaveAttribute(
      "stroke",
      "#2456D6",
    );
    expect(screen.getByText("₦100k")).toBeInTheDocument();
    expect(screen.getByText("June")).toBeInTheDocument();
  });

  it("legend variants right / bottom / none", () => {
    const { container, rerender } = render(
      <ChartDonut slices={slices} legend="right" />,
    );
    expect(container.querySelector('[data-legend="right"]')).not.toBeNull();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    rerender(<ChartDonut slices={slices} legend="bottom" />);
    expect(container.querySelector('[data-legend="bottom"]')).not.toBeNull();
    rerender(<ChartDonut slices={slices} legend="none" />);
    expect(screen.queryByText("Transport")).not.toBeInTheDocument();
  });

  it("loading and empty states", () => {
    const { rerender } = render(<ChartDonut state="loading" />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    rerender(<ChartDonut state="empty" emptyKind="ratios" />);
    expect(screen.getByText("No ratios yet")).toBeInTheDocument();
  });
});
