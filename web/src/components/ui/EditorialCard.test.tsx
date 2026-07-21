import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import EditorialCard from "./EditorialCard";

describe("EditorialCard (design.md §8.2b)", () => {
  it("pillar card renders eyebrow, title, body", () => {
    render(
      <EditorialCard
        kind="pillar"
        eyebrow="Ledger"
        title="Numbers are the product"
        body="Tabular numerals everywhere."
        icon={Users}
      />,
    );
    expect(screen.getByText("Ledger")).toBeInTheDocument();
    expect(screen.getByText("Numbers are the product")).toBeInTheDocument();
    expect(
      screen.getByText("Tabular numerals everywhere."),
    ).toBeInTheDocument();
  });

  it("community kind sets data-kind; href renders a link with hover lift", () => {
    render(
      <EditorialCard
        kind="community"
        title="Contribute"
        body="PRs welcome."
        href="/contribute"
      />,
    );
    const card = screen.getByRole("link");
    expect(card).toHaveAttribute("data-kind", "community");
    expect(card).toHaveClass("hover:-translate-y-0.5");
  });

  it("renders the optional accent CTA line (Figma A4/A9 instances)", () => {
    render(
      <EditorialCard
        title="Statements → intelligence"
        body="Upload or link."
        cta="Explore imports"
        href="/signin"
      />,
    );
    expect(screen.getByText("Explore imports")).toHaveClass("text-accent-text");
  });
});
