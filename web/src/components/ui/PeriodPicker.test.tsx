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

  describe("collision placement (master contract 467:11039)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      // The prototype clientHeight spy shadows documentElement too —
      // drop the instance overrides installed by mockViewport.
      Reflect.deleteProperty(document.documentElement, "clientWidth");
      Reflect.deleteProperty(document.documentElement, "clientHeight");
    });

    // The hook reads the viewport from documentElement (scrollbar-safe);
    // pin it per test so the element-prototype spies cannot leak into it.
    const mockViewport = (width: number, height: number) => {
      vi.stubGlobal("innerWidth", width);
      vi.stubGlobal("innerHeight", height);
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: width,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, "clientHeight", {
        value: height,
        configurable: true,
      });
    };

    // The prototype mock feeds the TRIGGER rect (the hook only measures
    // the anchor); panel size comes from the offset/scroll spies.
    const mockGeometry = (rect: Partial<DOMRect>) => {
      vi.spyOn(
        window.HTMLElement.prototype,
        "getBoundingClientRect",
      ).mockReturnValue(rect as DOMRect);
      vi.spyOn(
        window.HTMLElement.prototype,
        "offsetWidth",
        "get",
      ).mockReturnValue(220);
      vi.spyOn(
        window.HTMLElement.prototype,
        "offsetHeight",
        "get",
      ).mockReturnValue(320);
      vi.spyOn(
        window.HTMLElement.prototype,
        "clientHeight",
        "get",
      ).mockReturnValue(320);
      vi.spyOn(
        window.HTMLElement.prototype,
        "scrollHeight",
        "get",
      ).mockReturnValue(320);
    };

    it("right-anchors the panel on a right-edge trigger (Overview header)", async () => {
      // Overview header regression: w-36 trigger at the right edge of a
      // 1440 viewport — the left-anchored 220px panel overflowed and sat
      // flush against the viewport edge with no gutter.
      mockViewport(1440, 900);
      mockGeometry({ left: 1272, right: 1416, top: 52, bottom: 84 });

      render(<PeriodPicker mode="month" value="2026-07" />);
      await userEvent.click(screen.getByRole("button"));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("right-0");
      expect(dialog).toHaveClass("top-full");
      expect(dialog.style.transform).toBe("");
    });

    it("flips the panel above a bottom-anchored trigger (never covers it)", async () => {
      mockViewport(1440, 900);
      mockGeometry({ left: 400, right: 544, top: 700, bottom: 732 });

      render(<PeriodPicker mode="month" value="2026-07" />);
      await userEvent.click(screen.getByRole("button"));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("bottom-full");
      expect(dialog.style.maxHeight).toBe("");
    });

    it("caps the panel with internal scroll when neither side fits", async () => {
      mockViewport(1440, 300);
      mockGeometry({ left: 400, right: 544, top: 40, bottom: 72 });

      render(<PeriodPicker mode="month" value="2026-07" />);
      await userEvent.click(screen.getByRole("button"));

      const dialog = screen.getByRole("dialog");
      // Below wins (more room): 300 − 8 − 72 − 4 = 216.
      expect(dialog.style.maxHeight).toBe("216px");
      expect(dialog.style.overflowY).toBe("auto");
    });

    it("leaves an in-viewport popover below, left-anchored and unshifted", async () => {
      mockViewport(1440, 900);
      mockGeometry({ left: 400, right: 544, top: 52, bottom: 84 });

      render(<PeriodPicker mode="month" value="2026-07" />);
      await userEvent.click(screen.getByRole("button"));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("top-full");
      expect(dialog).toHaveClass("left-0");
      expect(dialog.style.transform).toBe("");
      expect(dialog.style.maxHeight).toBe("");
    });
  });
});
