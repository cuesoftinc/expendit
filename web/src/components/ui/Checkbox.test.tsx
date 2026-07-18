import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checkbox from "./Checkbox";

describe("Checkbox (design.md §8.2b)", () => {
  it("renders unchecked and toggles on click", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox checked={false} onCheckedChange={onCheckedChange} label="All" />,
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
      <Checkbox checked={false} onCheckedChange={onCheckedChange} disabled />,
    );
    await userEvent
      .click(screen.getByRole("checkbox"))
      .catch(() => undefined);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
