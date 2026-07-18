import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Tag from "./Tag";

describe("Tag/Badge (design.md §8.2b)", () => {
  it("renders every tint with its data attribute", () => {
    const tints = [
      "neutral",
      "info",
      "warn",
      "error",
      "success",
      "new-accent",
    ] as const;
    for (const tint of tints) {
      const { unmount } = render(<Tag tint={tint}>NEW</Tag>);
      expect(screen.getByText("NEW")).toHaveAttribute("data-tint", tint);
      unmount();
    }
  });

  it("count mode caps at 9+", () => {
    const { rerender } = render(<Tag count={4} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    rerender(<Tag count={12} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("sizes sm/md switch the type ramp", () => {
    const { rerender } = render(<Tag size="sm">A</Tag>);
    expect(screen.getByText("A")).toHaveClass("text-[11px]");
    rerender(<Tag size="md">A</Tag>);
    expect(screen.getByText("A")).toHaveClass("text-[13px]");
  });
});
