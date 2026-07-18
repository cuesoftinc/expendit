import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketingFooter from "./MarketingFooter";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Self-host", href: "/#self-host" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "GitHub", href: "https://github.com/cuesoftinc/expendit" },
    ],
  },
];

describe("MarketingFooter (design.md §8.2b)", () => {
  it("renders dark-scoped link columns", () => {
    render(<MarketingFooter columns={columns} />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveAttribute("data-theme", "dark");
    expect(footer).toHaveClass("bg-bg-editorial");
    expect(
      screen.getByRole("navigation", { name: "Product" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute(
      "href",
      "/#features",
    );
  });

  it("carries the View Security Policy CTA", () => {
    render(
      <MarketingFooter columns={columns} securityPolicyHref="/security" />,
    );
    expect(
      screen.getByRole("link", { name: /View Security Policy/ }),
    ).toHaveAttribute("href", "/security");
  });
});
