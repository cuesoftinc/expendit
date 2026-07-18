import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ColorSwatchPicker from "./ColorSwatchPicker";

const presets = ["#1B7F4B", "#2456D6", "#F46A1F"];

describe("ColorSwatchPicker (design.md §8.2b, B8)", () => {
  it("renders the preset grid and marks the selection", () => {
    render(<ColorSwatchPicker presets={presets} value="#2456D6" />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "#2456D6" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("selecting a swatch fires onValueChange", async () => {
    const onValueChange = vi.fn();
    render(
      <ColorSwatchPicker
        presets={presets}
        value={null}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "#F46A1F" }));
    expect(onValueChange).toHaveBeenCalledWith("#F46A1F");
  });
});
