import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Switch from "./Switch";

describe("Switch (design.md §8.2b)", () => {
  it("renders label + helper and toggles", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        checked={false}
        onCheckedChange={onCheckedChange}
        label="Auto-confirm"
        helper="After 3 clean syncs"
      />,
    );
    expect(screen.getByText("After 3 clean syncs")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("on state is reflected via aria-checked", () => {
    render(<Switch checked label="Dark" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("disabled blocks toggling", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch checked={false} onCheckedChange={onCheckedChange} disabled />,
    );
    await userEvent.click(screen.getByRole("switch")).catch(() => undefined);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
