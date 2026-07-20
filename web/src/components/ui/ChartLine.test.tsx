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
    // 4 points → datum 2 sits at 2/3 of the plot width, not the even
    // two-label spread (0% / 100%).
    expect(parseFloat(screen.getByText("Mar").style.left)).toBeCloseTo(
      66.667,
      2,
    );
    expect(parseFloat(screen.getByText("Jan").style.left)).toBe(0);
  });

  it("y axis renders by default: nice ₦-compact ticks + a gridline each (Figma master)", () => {
    const { container } = render(
      <ChartLine series={series} xLabels={["Jan", "Feb", "Mar", "Apr"]} />,
    );
    // Domain [0, 8] → nice ticks 0 / 5 / 10.
    const axis = screen.getByTestId("chart-y-axis");
    expect(axis).toHaveClass("text-text-2");
    const labels = [...axis.querySelectorAll("span")].map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(["₦0", "₦5", "₦10"]);
    const gridlines = container.querySelectorAll(
      '[data-testid="chart-gridline"]',
    );
    expect(gridlines).toHaveLength(3);
    expect(gridlines[0]).toHaveClass("stroke-border");
  });

  it("yTickFormat is the content-kind instance override", () => {
    render(<ChartLine series={series} yTickFormat={(value) => `${value}%`} />);
    expect(screen.getByTestId("chart-y-axis")).toHaveTextContent("10%");
  });

  it("negative domains tick below zero (dipping cash flow)", () => {
    render(
      <ChartLine
        series={[
          {
            id: "net",
            label: "Net",
            color: "accent" as const,
            points: [-1_134_650, 331_800, 1_529_700],
          },
        ]}
      />,
    );
    const labels = [
      ...screen.getByTestId("chart-y-axis").querySelectorAll("span"),
    ].map((node) => node.textContent);
    expect(labels).toEqual(["−₦1M", "₦0", "₦1M", "₦2M"]);
  });

  it("mobile thinning: interior ticks hide below sm (edges + zero stay)", () => {
    render(
      <ChartLine
        series={[
          {
            id: "net",
            label: "Net",
            color: "accent" as const,
            points: [-1_134_650, 331_800, 1_529_700],
          },
        ]}
        xLabels={["Aug", "Oct", "Dec"]}
      />,
    );
    // Ticks −1M / 0 / 1M / 2M: only ₦1M is interior non-zero.
    expect(screen.getByText("₦1M")).toHaveClass("max-sm:hidden");
    expect(screen.getByText("−₦1M")).not.toHaveClass("max-sm:hidden");
    expect(screen.getByText("₦0")).not.toHaveClass("max-sm:hidden");
    expect(screen.getByText("₦2M")).not.toHaveClass("max-sm:hidden");
    // X labels: interior months hide, edges stay.
    expect(screen.getByText("Oct")).toHaveClass("max-sm:hidden");
    expect(screen.getByText("Aug")).not.toHaveClass("max-sm:hidden");
    expect(screen.getByText("Dec")).not.toHaveClass("max-sm:hidden");
  });

  it("yAxis={false} keeps the bare hairline variant (no labels, no gridlines)", () => {
    const { container } = render(<ChartLine series={series} yAxis={false} />);
    expect(screen.queryByTestId("chart-y-axis")).toBeNull();
    expect(
      container.querySelectorAll('[data-testid="chart-gridline"]'),
    ).toHaveLength(0);
    // The austere axis hairlines remain.
    expect(container.querySelectorAll("line")).toHaveLength(2);
  });

  it("multi-series charts carry a legend; single-series charts do not", () => {
    const multi = render(<ChartLine series={series} />);
    expect(multi.container.querySelector("figcaption")).not.toBeNull();
    multi.unmount();
    const single = render(<ChartLine series={[series[0]]} />);
    // Redundant single-series legend row dropped (Figma B1 has none).
    expect(single.container.querySelector("figcaption")).toBeNull();
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
