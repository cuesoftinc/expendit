import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Kbd from "./Kbd";

describe("Kbd (design.md §8.2b, MI-1 hints)", () => {
  it("renders a single key", () => {
    render(<Kbd keys="K" />);
    expect(screen.getByText("K").tagName).toBe("KBD");
  });

  it("renders a chord as separate keycaps", () => {
    render(<Kbd keys={["⌘", "K"]} />);
    expect(screen.getByText("⌘").tagName).toBe("KBD");
    expect(screen.getByText("K").tagName).toBe("KBD");
  });
});
