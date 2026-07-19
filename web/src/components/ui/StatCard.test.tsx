import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "./StatCard";

describe("StatCard (design.md §8.2, MI-7)", () => {
  it("renders label + tabular value", () => {
    render(<StatCard label="Net cash" value={1240300} />);
    expect(screen.getByText("Net cash")).toBeInTheDocument();
    expect(screen.getByText("1,240,300")).toHaveClass("tabular-nums");
  });

  it("initial render shows the final value (no count-up on mount)", () => {
    render(<StatCard label="Income" value={5000} />);
    expect(screen.getByText("5,000")).toBeInTheDocument();
  });

  it("delta chip renders sign + direction", () => {
    const { rerender } = render(
      <StatCard label="Income" value={100} delta={0.042} />,
    );
    expect(screen.getByTestId("stat-delta")).toHaveTextContent("+4.2%");
    expect(screen.getByTestId("stat-delta")).toHaveClass("text-income");
    rerender(<StatCard label="Income" value={100} delta={-0.08} />);
    expect(screen.getByTestId("stat-delta")).toHaveTextContent("−8.0%");
    expect(screen.getByTestId("stat-delta")).toHaveClass("text-expense");
  });

  it("sparkline renders as bespoke SVG when series given", () => {
    const { rerender } = render(
      <StatCard label="Income" value={100} sparkline={[1, 4, 2, 8]} />,
    );
    expect(screen.getByTestId("stat-sparkline").tagName).toBe("svg");
    rerender(<StatCard label="Income" value={100} />);
    expect(screen.queryByTestId("stat-sparkline")).not.toBeInTheDocument();
  });

  it("loading variant renders the stat skeleton, delta + sparkline off", () => {
    render(
      <StatCard
        label="Income"
        value={100}
        delta={0.1}
        sparkline={[1, 2]}
        loading
      />,
    );
    expect(screen.getByTestId("skeleton-stat")).toBeInTheDocument();
    expect(screen.queryByTestId("stat-delta")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stat-sparkline")).not.toBeInTheDocument();
  });

  it("supports a custom money format", () => {
    render(
      <StatCard
        label="Net"
        value={1500}
        format={(value) => `₦${Math.round(value).toLocaleString("en-NG")}`}
      />,
    );
    expect(screen.getByText("₦1,500")).toBeInTheDocument();
  });

  it("down-good metrics tint a falling delta as improvement (system QA regression)", () => {
    render(
      <StatCard
        label="Expenses"
        value={100}
        delta={-0.686}
        deltaDirection="down-good"
      />,
    );
    const chip = screen.getByTestId("stat-delta");
    expect(chip.className).toContain("text-income");
    // Sign still encodes the raw direction (design.md §5).
    expect(chip.textContent).toContain("−68.6%");
  });

  it("down-good metrics tint a rising delta as regression", () => {
    render(
      <StatCard
        label="Expenses"
        value={100}
        delta={0.034}
        deltaDirection="down-good"
      />,
    );
    expect(screen.getByTestId("stat-delta").className).toContain(
      "text-expense",
    );
  });
});
