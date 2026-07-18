import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
    await userEvent.click(screen.getByRole("button", { name: "Q2 2026" }));
    expect(onValueChange).toHaveBeenCalledWith("2026-Q2");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
});
