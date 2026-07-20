import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addMonths, format } from "date-fns";
import {
  calendarDays,
  DatePicker,
  MonthPicker,
  QuarterPicker,
  YearPicker,
} from "./DatePicker";

describe("calendarDays (grid math)", () => {
  it("covers a leap-year February including the 29th", () => {
    const days = calendarDays(new Date(2024, 1, 1));
    const isos = days.map((day) => format(day, "yyyy-MM-dd"));
    expect(isos).toContain("2024-02-29");
    // Feb 2024 starts Thursday → the grid opens Monday Jan 29 and
    // closes Sunday Mar 3: exactly five ISO weeks.
    expect(isos[0]).toBe("2024-01-29");
    expect(isos.at(-1)).toBe("2024-03-03");
    expect(days).toHaveLength(35);
  });

  it("never shows Feb 29 in a non-leap year", () => {
    const isos = calendarDays(new Date(2026, 1, 1)).map((day) =>
      format(day, "yyyy-MM-dd"),
    );
    expect(isos).not.toContain("2026-02-29");
    expect(isos).toContain("2026-02-28");
  });

  it("aligns every month to full Monday-first weeks", () => {
    for (let offset = 0; offset < 24; offset += 1) {
      const month = addMonths(new Date(2025, 0, 1), offset);
      const days = calendarDays(month);
      expect(days.length % 7).toBe(0);
      expect(days[0].getDay()).toBe(1); // Monday
      expect(days.at(-1)?.getDay()).toBe(0); // Sunday
      // The 1st is always inside the grid (month is its own 1st here).
      const isos = days.map((day) => format(day, "yyyy-MM-dd"));
      expect(isos).toContain(format(month, "yyyy-MM-dd"));
    }
  });
});

describe("DatePicker (design.md §8.2b calendar grid)", () => {
  it("renders the value's month with the selected day pressed", () => {
    render(<DatePicker value={new Date(2026, 5, 15)} onSelect={vi.fn()} />);
    expect(screen.getByRole("grid", { name: "June 2026" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "15 June 2026" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("selects the clicked day", async () => {
    const onSelect = vi.fn();
    render(<DatePicker value={new Date(2026, 5, 15)} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "18 June 2026" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(format(onSelect.mock.calls[0][0], "yyyy-MM-dd")).toBe("2026-06-18");
  });

  it("marks today with aria-current", () => {
    render(<DatePicker value={null} onSelect={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: format(new Date(), "d MMMM yyyy") }),
    ).toHaveAttribute("aria-current", "date");
  });

  it("disables days outside min/max and swallows their clicks", async () => {
    const onSelect = vi.fn();
    render(
      <DatePicker
        value={new Date(2026, 5, 15)}
        onSelect={onSelect}
        minDate={new Date(2026, 5, 10)}
        maxDate={new Date(2026, 5, 20)}
      />,
    );
    const before = screen.getByRole("button", { name: "5 June 2026" });
    const after = screen.getByRole("button", { name: "25 June 2026" });
    expect(before).toBeDisabled();
    expect(after).toBeDisabled();
    expect(screen.getByRole("button", { name: "10 June 2026" })).toBeEnabled();
    await userEvent.click(before);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("navigates months with the chevrons", async () => {
    render(<DatePicker value={new Date(2026, 5, 15)} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("grid", { name: "July 2026" })).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Previous month" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Previous month" }),
    );
    expect(screen.getByRole("grid", { name: "May 2026" })).toBeVisible();
  });

  it("snaps the visible month when the controlled value moves (typed sync)", () => {
    const { rerender } = render(
      <DatePicker value={new Date(2026, 5, 15)} onSelect={vi.fn()} />,
    );
    rerender(<DatePicker value={new Date(2027, 2, 3)} onSelect={vi.fn()} />);
    expect(screen.getByRole("grid", { name: "March 2027" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "3 March 2027" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("roves focus with arrow keys and flips the month at the edge", async () => {
    render(<DatePicker value={new Date(2026, 5, 30)} onSelect={vi.fn()} />);
    screen.getByRole("button", { name: "30 June 2026" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("grid", { name: "July 2026" })).toBeVisible();
    expect(screen.getByRole("button", { name: "1 July 2026" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "8 July 2026" })).toHaveFocus();
  });

  it("presses both endpoints of a range", () => {
    render(
      <DatePicker
        value={new Date(2026, 5, 10)}
        rangeEnd={new Date(2026, 5, 12)}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "10 June 2026" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "12 June 2026" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

describe("MonthPicker (year nav + 12-month grid)", () => {
  it("renders 12 months with the selected one pressed", () => {
    render(<MonthPicker value={new Date(2026, 5, 1)} onSelect={vi.fn()} />);
    expect(screen.getByText("2026")).toBeVisible();
    expect(screen.getByRole("button", { name: "June 2026" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("button", { name: /\w+ 2026$/ })).toHaveLength(
      12,
    );
  });

  it("navigates years and selects a month start", async () => {
    const onSelect = vi.fn();
    render(<MonthPicker value={new Date(2026, 5, 1)} onSelect={onSelect} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Previous year" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "March 2025" }));
    expect(format(onSelect.mock.calls[0][0], "yyyy-MM")).toBe("2025-03");
  });

  it("marks the current month with aria-current", () => {
    render(<MonthPicker value={null} onSelect={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: format(new Date(), "MMMM yyyy") }),
    ).toHaveAttribute("aria-current", "date");
  });
});

describe("QuarterPicker (year nav + Q1–Q4)", () => {
  it("selects a quarter in the navigated year", async () => {
    const onSelect = vi.fn();
    render(
      <QuarterPicker value={{ year: 2026, quarter: 2 }} onSelect={onSelect} />,
    );
    expect(screen.getByRole("button", { name: "Q2 2026" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Previous year" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Q4 2025" }));
    expect(onSelect).toHaveBeenCalledWith({ year: 2025, quarter: 4 });
  });
});

describe("YearPicker (list, newest first)", () => {
  it("lists years through the label mapping and selects one", async () => {
    const onSelect = vi.fn();
    render(
      <YearPicker
        value={2025}
        from={2026}
        count={4}
        formatLabel={(year) => `FY${year}`}
        onSelect={onSelect}
      />,
    );
    const labels = screen
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(labels).toEqual(["FY2026", "FY2025", "FY2024", "FY2023"]);
    expect(screen.getByRole("button", { name: "FY2025" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "FY2024" }));
    expect(onSelect).toHaveBeenCalledWith(2024);
  });

  it("joins a selected year outside the window into the list", () => {
    render(
      <YearPicker value={2018} from={2026} count={4} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "2018" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
