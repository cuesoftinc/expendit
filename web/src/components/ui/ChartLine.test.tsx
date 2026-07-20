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

  it("pointMarkers renders one circle per datum (B6b discrete FY reading)", () => {
    const { container } = render(
      <ChartLine
        pointMarkers
        series={series}
        xLabels={["FY2024", "FY2025", "FY2026", "FY2027"]}
      />,
    );
    const income = screen.getByTestId("chart-markers-income");
    expect(income.querySelectorAll("circle")).toHaveLength(4);
    expect(income.querySelector("circle")).toHaveClass("fill-income");
    expect(
      screen.getByTestId("chart-markers-expense").querySelectorAll("circle"),
    ).toHaveLength(4);
    // The plot insets so edge markers are not clipped by the viewBox.
    const first = income.querySelector("circle")!;
    expect(Number(first.getAttribute("cx"))).toBeGreaterThan(0);
    expect(container.querySelectorAll("polyline")).toHaveLength(2);
  });

  it("no markers by default (continuous series stay austere)", () => {
    render(<ChartLine series={series} />);
    expect(screen.queryByTestId("chart-markers-income")).toBeNull();
  });

  it("xLabelIndices pins thinned ticks to their data positions", () => {
    render(
      <ChartLine
        series={[series[0]]}
        xLabels={["Jan", "Mar"]}
        xLabelIndices={[0, 2]}
      />,
    );
    // 4 points across 480 wide → datum 2 sits at x = 320, not the even
    // two-label spread (0 / 480).
    expect(Number(screen.getByText("Mar").getAttribute("x"))).toBe(320);
    expect(Number(screen.getByText("Jan").getAttribute("x"))).toBe(0);
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
