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
    {
      label: "GitHub",
      href: "https://github.com/cuesoftinc/expendit",
      star: true,
    },
  ],
};

const STAR_NAME = "Star cuesoftinc/expendit on GitHub";

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

  it("renders the canonical links — GitHub as the star badge, externals in a new tab", () => {
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
    const github = screen.getByRole("link", { name: STAR_NAME });
    expect(github).toHaveAttribute(
      "href",
      "https://github.com/cuesoftinc/expendit",
    );
    expect(github).toHaveAttribute("target", "_blank");
    // Neutral badge — no count is ever hardcoded.
    expect(github.textContent).toBe("Star");
  });

  it("star badge renders the live count when provided", () => {
    render(<MarketingNav {...props} starCount={1280} />);
    const github = screen.getByRole("link", { name: STAR_NAME });
    expect(github.textContent).toBe("Star1,280");
  });

  it("Sign in is a text link and Try Cloud the primary CTA — both to /signin", async () => {
    const onTryCloud = vi.fn();
    render(<MarketingNav {...props} onTryCloud={onTryCloud} />);
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/signin");
    expect(signIn).not.toHaveClass("bg-accent");
    const tryCloud = screen.getByRole("link", { name: "Try Cloud" });
    expect(tryCloud).toHaveAttribute("href", "/signin");
    expect(tryCloud).toHaveClass("bg-accent");
    tryCloud.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(tryCloud);
    expect(onTryCloud).toHaveBeenCalled();
  });

  it("link clicks report their label (github_click analytics hook)", async () => {
    const onLinkClick = vi.fn();
    render(<MarketingNav {...props} onLinkClick={onLinkClick} />);
    const github = screen.getByRole("link", { name: STAR_NAME });
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

  it("mobile: hamburger disclosure carries the 4 links + trailing + Sign in + Try Cloud (parity canon)", async () => {
    render(
      <MarketingNav {...props} trailing={<span data-testid="slot">t</span>} />,
    );
    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(
      menu.getAttribute("aria-controls") ?? "",
    );
    expect(panel).toBeTruthy();
    // Same 4 canonical links (desktop set + panel set both render).
    for (const [label, href] of [
      ["Features", "#product"],
      ["Pricing", "#compare"],
      ["Docs", "https://cuesoft.gitbook.io/expendit"],
      [STAR_NAME, "https://github.com/cuesoftinc/expendit"],
    ] as const) {
      const links = screen.getAllByRole("link", { name: label });
      expect(links.length).toBeGreaterThanOrEqual(2);
      for (const link of links) expect(link).toHaveAttribute("href", href);
    }
    expect(screen.getAllByRole("link", { name: "Sign in" }).length).toBe(2);
    expect(screen.getAllByRole("link", { name: "Try Cloud" }).length).toBe(2);
    expect(screen.getAllByTestId("slot").length).toBe(2);

    await userEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });
});
