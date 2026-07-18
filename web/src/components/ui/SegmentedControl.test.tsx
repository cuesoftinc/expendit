import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SegmentedControl from "./SegmentedControl";

const density = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

describe("SegmentedControl (design.md §8.2b)", () => {
  it("marks the selected segment and switches on click", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="Density"
        options={density}
        value="comfortable"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("radio", { name: "Comfortable" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await userEvent.click(screen.getByRole("radio", { name: "Compact" }));
    expect(onValueChange).toHaveBeenCalledWith("compact");
  });

  it("disabled control blocks switching", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        options={density}
        value="compact"
        onValueChange={onValueChange}
        disabled
      />,
    );
    await userEvent
      .click(screen.getByRole("radio", { name: "Comfortable" }))
      .catch(() => undefined);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
