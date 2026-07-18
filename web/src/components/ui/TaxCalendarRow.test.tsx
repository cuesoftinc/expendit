import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TaxCalendarRow, { thresholdFor } from "./TaxCalendarRow";

const entry = {
  kind: "vat" as const,
  period: "2026-06",
  due_date: "2026-07-21",
  authority: {
    code: "FIRS",
    name: "Federal Inland Revenue Service",
    payment_channels: [],
  },
};

describe("TaxCalendarRow (design.md §8.2, MI-13)", () => {
  it("threshold escalation: T-30 → T-7 → T-1", () => {
    expect(thresholdFor(45)).toBe("none");
    expect(thresholdFor(30)).toBe("t-30");
    expect(thresholdFor(7)).toBe("t-7");
    expect(thresholdFor(1)).toBe("t-1");
    expect(thresholdFor(0)).toBe("t-1");
  });

  it("renders kind, period, authority, due date", () => {
    render(<TaxCalendarRow entry={entry} daysToDue={60} />);
    expect(screen.getByText("vat")).toBeInTheDocument();
    expect(screen.getByText("2026-06")).toBeInTheDocument();
    expect(
      screen.getByText("Federal Inland Revenue Service"),
    ).toBeInTheDocument();
    expect(screen.getByText("due 2026-07-21")).toBeInTheDocument();
    expect(screen.getByRole("row")).toHaveAttribute("data-threshold", "none");
  });

  it("tints escalate info → warn → expense", () => {
    const { rerender } = render(<TaxCalendarRow entry={entry} daysToDue={20} />);
    expect(screen.getByRole("row")).toHaveClass("bg-info/10");
    rerender(<TaxCalendarRow entry={entry} daysToDue={5} />);
    expect(screen.getByRole("row")).toHaveClass("bg-warn/10");
    rerender(<TaxCalendarRow entry={entry} daysToDue={1} />);
    expect(screen.getByRole("row")).toHaveClass("bg-expense/10");
    expect(screen.getByText("t-1")).toBeInTheDocument();
  });
});
