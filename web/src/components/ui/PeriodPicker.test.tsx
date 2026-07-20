import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PeriodPicker, { isValidPeriod } from "./PeriodPicker";

describe("PeriodPicker (design.md §8.2b)", () => {
  it("validates the closed period grammar per mode", () => {
    expect(isValidPeriod("day", "2026-06-01")).toBe(true);
    expect(isValidPeriod("range", "2026-06-01..2026-06-30")).toBe(true);
    expect(isValidPeriod("month", "2026-06")).toBe(true);
    expect(isValidPeriod("quarter", "2026-Q2")).toBe(true);
    expect(isValidPeriod("year", "FY2026")).toBe(true);
    expect(isValidPeriod("quarter", "2026-Q5")).toBe(false);
    expect(isValidPeriod("month", "June 2026")).toBe(false);
  });

  it("opens, applies a preset, and closes", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker
        mode="quarter"
        value={null}
        onValueChange={onValueChange}
        presets={[
          { label: "Q1 2026", value: "2026-Q1" },
          { label: "Q2 2026", value: "2026-Q2" },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    // The preset chip and the quarter-grid cell can share an accessible
    // name ("Q2 2026") — both commit the same period; the chip renders
    // first in DOM order.
    await userEvent.click(
      screen.getAllByRole("button", { name: "Q2 2026" })[0],
    );
    expect(onValueChange).toHaveBeenCalledWith("2026-Q2");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("picks a day from the embedded calendar and commits it", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker
        mode="day"
        value="2026-06-15"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("grid", { name: "June 2026" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "18 June 2026" }));
    expect(onValueChange).toHaveBeenCalledWith("2026-06-18");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("picks a range in two clicks, normalizing the order", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker
        mode="range"
        value="2026-06-01..2026-06-30"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button", { name: "12 June 2026" }));
    // First click holds the pending start in the grammar input.
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("YYYY-MM-DD..YYYY-MM-DD")).toHaveValue(
      "2026-06-12..",
    );
    // Second click before the start swaps the endpoints.
    await userEvent.click(screen.getByRole("button", { name: "10 June 2026" }));
    expect(onValueChange).toHaveBeenCalledWith("2026-06-10..2026-06-12");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("picks a month from the 12-month grid", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker
        mode="month"
        value="2026-06"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button", { name: "March 2026" }));
    expect(onValueChange).toHaveBeenCalledWith("2026-03");
  });

  it("picks a quarter from the Q1–Q4 grid", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker
        mode="quarter"
        value="2026-Q2"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(
      within(screen.getByTestId("quarter-picker")).getByRole("button", {
        name: "Q3 2026",
      }),
    );
    expect(onValueChange).toHaveBeenCalledWith("2026-Q3");
  });

  it("picks a year from the FY list", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker mode="year" value="FY2024" onValueChange={onValueChange} />,
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(
      within(screen.getByTestId("year-picker")).getByRole("button", {
        name: "FY2025",
      }),
    );
    expect(onValueChange).toHaveBeenCalledWith("FY2025");
  });

  it("syncs a valid typed draft into the grid before Apply (type ↔ pick)", async () => {
    render(<PeriodPicker mode="month" value="2026-06" />);
    await userEvent.click(screen.getByRole("button"));
    const input = screen.getByPlaceholderText("YYYY-MM");
    await userEvent.clear(input);
    await userEvent.type(input, "2027-03");
    expect(screen.getByText("2027")).toBeVisible();
    expect(screen.getByRole("button", { name: "March 2027" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("cancels without committing (master's Cancel/Apply footer)", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker
        mode="month"
        value="2026-06"
        onValueChange={onValueChange}
      />,
    );
    const trigger = screen.getByRole("button");
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("returns focus to the trigger on Escape", async () => {
    render(<PeriodPicker mode="month" value="2026-06" />);
    const trigger = screen.getByRole("button");
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("rejects grammar-invalid manual input with an inline error", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker mode="month" value={null} onValueChange={onValueChange} />,
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.type(screen.getByPlaceholderText("YYYY-MM"), "junk");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Expected YYYY-MM");
  });

  it("commits valid manual input on Enter", async () => {
    const onValueChange = vi.fn();
    render(
      <PeriodPicker mode="year" value={null} onValueChange={onValueChange} />,
    );
    await userEvent.click(screen.getByRole("button"));
    await userEvent.type(
      screen.getByPlaceholderText("FYYYYY"),
      "FY2026{Enter}",
    );
    expect(onValueChange).toHaveBeenCalledWith("FY2026");
  });

  it("renders external error state", () => {
    render(<PeriodPicker mode="month" value="2026-06" error="Out of range" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Out of range");
  });

  describe("viewport collision clamp (system QA 2026-07-19)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("translates the popover back inside the viewport when it would overflow right", async () => {
      // Overview header regression: w-36 trigger at the right edge of a
      // 1440 viewport; the min-w-56 panel overflowed by 56px.
      vi.stubGlobal("innerWidth", 1440);
      vi.stubGlobal("innerHeight", 900);
      vi.spyOn(
        window.HTMLElement.prototype,
        "getBoundingClientRect",
      ).mockReturnValue({
        left: 1272,
        right: 1496,
        top: 100,
        bottom: 420,
      } as DOMRect);

      render(<PeriodPicker mode="month" value="2026-07" />);
      await userEvent.click(screen.getByRole("button"));

      expect(screen.getByRole("dialog")).toHaveStyle({
        transform: "translate(-64px, 0px)",
      });
    });

    it("translates the popover up when the calendar would clip the bottom edge", async () => {
      // The embedded grids made the panel tall enough to clip below on
      // low anchors (390 canon viewport) — the same 1-D clamp runs on Y.
      vi.stubGlobal("innerWidth", 1440);
      vi.stubGlobal("innerHeight", 900);
      vi.spyOn(
        window.HTMLElement.prototype,
        "getBoundingClientRect",
      ).mockReturnValue({
        left: 400,
        right: 624,
        top: 700,
        bottom: 1020,
      } as DOMRect);

      render(<PeriodPicker mode="month" value="2026-07" />);
      await userEvent.click(screen.getByRole("button"));

      expect(screen.getByRole("dialog")).toHaveStyle({
        transform: "translate(0px, -128px)",
      });
    });

    it("leaves an in-viewport popover unshifted", async () => {
      vi.stubGlobal("innerWidth", 1440);
      vi.stubGlobal("innerHeight", 900);
      vi.spyOn(
        window.HTMLElement.prototype,
        "getBoundingClientRect",
      ).mockReturnValue({
        left: 400,
        right: 624,
        top: 100,
        bottom: 420,
      } as DOMRect);

      render(<PeriodPicker mode="month" value="2026-07" />);
      await userEvent.click(screen.getByRole("button"));

      expect(screen.getByRole("dialog").style.transform).toBe("");
    });
  });
});
