import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MarketingNav from "./MarketingNav";

// Canonical inventory (nav/footer parity canon, 2026-07-19): 4 text links
// + trailing slot (theme toggle) + the Sign in CTA.
const props = {
  links: [
    { label: "Features", href: "#product" },
    { label: "Pricing", href: "#compare" },
    { label: "Docs", href: "https://cuesoft.gitbook.io/expendit" },
    { label: "GitHub", href: "https://github.com/cuesoftinc/expendit" },
  ],
};

describe("MarketingNav (design.md §8.2b + parity canon)", () => {
  it("on-dark variant scopes dark token mode over the hero", () => {
    render(<MarketingNav variant="on-dark" {...props} />);
    const nav = screen.getByRole("navigation", { name: "Marketing" });
    expect(nav).toHaveAttribute("data-variant", "on-dark");
    expect(nav).toHaveAttribute("data-theme", "dark");
    expect(nav).toHaveClass("bg-bg-editorial");
  });

  it("dark-on-light variant is sticky without the dark scope", () => {
    render(<MarketingNav variant="dark-on-light" {...props} />);
    const nav = screen.getByRole("navigation", { name: "Marketing" });
    expect(nav).not.toHaveAttribute("data-theme");
    expect(nav).toHaveClass("sticky");
  });

  it("renders the canonical links — external ones open in a new tab", () => {
    render(<MarketingNav {...props} />);
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute(
      "href",
      "#product",
    );
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "#compare",
    );
    const docs = screen.getByRole("link", { name: "Docs" });
    expect(docs).toHaveAttribute("href", "https://cuesoft.gitbook.io/expendit");
    expect(docs).toHaveAttribute("target", "_blank");
    const github = screen.getByRole("link", { name: "GitHub" });
    expect(github).toHaveAttribute(
      "href",
      "https://github.com/cuesoftinc/expendit",
    );
    expect(github).toHaveAttribute("target", "_blank");
  });

  it("Sign in is the CTA and links to /signin", () => {
    render(<MarketingNav {...props} />);
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/signin");
    expect(signIn).toHaveClass("bg-accent");
  });

  it("link clicks report their label (github_click analytics hook)", async () => {
    const onLinkClick = vi.fn();
    render(<MarketingNav {...props} onLinkClick={onLinkClick} />);
    const github = screen.getByRole("link", { name: "GitHub" });
    github.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(github);
    expect(onLinkClick).toHaveBeenCalledWith("GitHub");
  });

  it("renders the trailing slot (theme toggle position)", () => {
    render(
      <MarketingNav {...props} trailing={<span data-testid="slot">t</span>} />,
    );
    expect(screen.getByTestId("slot")).toBeInTheDocument();
  });
});
