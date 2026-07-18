import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Avatar from "./Avatar";

describe("Avatar (design.md §8.2b)", () => {
  it("renders an image when src is given", () => {
    render(<Avatar name="Ada Obi" src="https://example.test/a.png" />);
    expect(screen.getByAltText("Ada Obi")).toBeInTheDocument();
  });

  it("falls back to initials from the name", () => {
    render(<Avatar name="Ada Obi" />);
    expect(screen.getByText("AO")).toBeInTheDocument();
  });

  it("falls back to the icon without name or src", () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("supports xs/sm/md sizes", () => {
    const { container, rerender } = render(<Avatar name="A" size="xs" />);
    expect(container.firstChild).toHaveClass("h-5");
    rerender(<Avatar name="A" size="md" />);
    expect(container.firstChild).toHaveClass("h-9");
  });
});
