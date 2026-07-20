import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Wordmark from "./Wordmark";

describe("Wordmark (brand mark, Figma 178:19)", () => {
  it("renders the name with the accent dot", () => {
    const { container } = render(<Wordmark />);
    expect(container.firstElementChild).toHaveTextContent(/^expendit\.$/);
    expect(screen.getByText(".")).toHaveClass("text-accent");
  });

  it("takes the caller's typography classes", () => {
    const { container } = render(<Wordmark className="text-2xl font-bold" />);
    expect(container.firstElementChild).toHaveClass("text-2xl", "font-bold");
  });
});
