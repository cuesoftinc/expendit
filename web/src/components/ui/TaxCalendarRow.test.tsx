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

  it("renders kind · period and the Figma due date", () => {
    render(<TaxCalendarRow entry={entry} daysToDue={60} />);
    expect(screen.getByText("VAT")).toBeInTheDocument();
    expect(screen.getByText(/· 2026-06/)).toBeInTheDocument();
    // Figma: "Due 21 Jul 2026"; authority carried on the row title.
    expect(screen.getByText("Due 21 Jul 2026")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveAttribute(
      "title",
      "Federal Inland Revenue Service",
    );
    expect(screen.getByRole("listitem")).toHaveAttribute("data-threshold", "none");
  });

  it("tints escalate info → warn → warn-stronger (Figma MI-13)", () => {
    const { rerender } = render(
      <TaxCalendarRow entry={entry} daysToDue={20} />,
    );
    expect(screen.getByRole("listitem")).toHaveClass("bg-info/[0.08]");
    expect(screen.getByText("Due in 30 days")).toBeInTheDocument();
    rerender(<TaxCalendarRow entry={entry} daysToDue={5} />);
    expect(screen.getByRole("listitem")).toHaveClass("bg-warn/[0.08]");
    expect(screen.getByText("Due in 7 days")).toBeInTheDocument();
    rerender(<TaxCalendarRow entry={entry} daysToDue={1} />);
    // T-1 stays warn (stronger), never expense.
    expect(screen.getByRole("listitem")).toHaveClass("bg-warn/[0.12]");
    expect(screen.getByText("Due tomorrow")).toBeInTheDocument();
  });
});
