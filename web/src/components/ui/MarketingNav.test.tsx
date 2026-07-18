import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MarketingNav from "./MarketingNav";

const props = {
  links: [{ label: "Docs", href: "/docs" }],
  solutions: [
    { label: "Freelancers", href: "/solutions/freelancers" },
    { label: "SMEs", href: "/solutions/smes" },
  ],
};

describe("MarketingNav (design.md §8.2b)", () => {
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

  it("Solutions dropdown opens with menu items", async () => {
    render(<MarketingNav {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /Solutions/ }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Freelancers" }),
    ).toBeInTheDocument();
  });

  it("GitHub badge is the neutral Star (no count)", () => {
    render(<MarketingNav {...props} />);
    const badge = screen.getByRole("link", { name: /Star/ });
    expect(badge).toHaveAttribute(
      "href",
      "https://github.com/cuesoftinc/expendit",
    );
    expect(badge.textContent).toBe("Star");
  });

  it("Sign in + Try Cloud CTAs fire", async () => {
    const onSignIn = vi.fn();
    const onTryCloud = vi.fn();
    render(
      <MarketingNav {...props} onSignIn={onSignIn} onTryCloud={onTryCloud} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await userEvent.click(screen.getByRole("button", { name: "Try Cloud" }));
    expect(onSignIn).toHaveBeenCalled();
    expect(onTryCloud).toHaveBeenCalled();
  });
});
