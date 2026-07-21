import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checkbox from "./Checkbox";

describe("Checkbox (design.md §8.2b)", () => {
  it("renders unchecked and toggles on click", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        checked={false}
        onCheckedChange={onCheckedChange}
        label="All"
      />,
    );
    const box = screen.getByRole("checkbox", { name: "All" });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("supports the indeterminate state", () => {
    render(<Checkbox checked="indeterminate" label="Some" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-checked",
      "mixed",
    );
  });

  it("disabled blocks interaction", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
        aria-label="Disabled box"
      />,
    );
    await userEvent.click(screen.getByRole("checkbox")).catch(() => undefined);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  // 2026-07-21 a11y audit lock: the API cannot produce an unnamed control.
  // Label-less checkboxes (table row selects) take aria-label as their
  // accessible name; the CheckboxProps union makes one of label/aria-label
  // compile-mandatory.
  it("aria-label names a label-less checkbox", () => {
    render(
      <Checkbox
        checked={false}
        aria-label="Select transaction Jumia order, 12 Jan"
      />,
    );
    expect(
      screen.getByRole("checkbox", {
        name: "Select transaction Jumia order, 12 Jan",
      }),
    ).toBeInTheDocument();
  });

  it("rejects a name-less usage at the type level", () => {
    // @ts-expect-error — accessible name (label or aria-label) is required.
    const nameless = <Checkbox checked={false} />;
    expect(nameless).toBeTruthy();
  });
});
