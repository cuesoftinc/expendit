import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ChartLine from "./ChartLine";

const series = [
  {
    id: "income",
    label: "Income",
    color: "income" as const,
    points: [2, 5, 3, 8],
  },
  {
    id: "expense",
    label: "Expense",
    color: "expense" as const,
    points: [1, 4, 2, 6],
  },
];

describe("Chart/Line (design.md §8.2b, MI-12)", () => {
  it("data state renders bespoke SVG polylines with token strokes", () => {
    render(
      <ChartLine series={series} xLabels={["Jan", "Feb", "Mar", "Apr"]} />,
    );
    expect(screen.getByTestId("chart-line-income")).toHaveClass(
      "stroke-income",
    );
    expect(screen.getByTestId("chart-line-expense")).toHaveClass(
      "stroke-expense",
    );
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Line chart: Income, Expense",
    );
  });

  it("MI-12: series draw in 400ms with reduced-motion fallback", () => {
    render(<ChartLine series={series} />);
    expect(screen.getByTestId("chart-line-income")).toHaveClass(
      "animate-draw-in",
      "motion-reduce:animate-none",
    );
  });

  it("loading renders the axis-first skeleton", () => {
    render(<ChartLine state="loading" series={series} />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
  });

  it("empty renders the MI-16 empty state", () => {
    render(<ChartLine state="empty" emptyKind="transactions" />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });
});
