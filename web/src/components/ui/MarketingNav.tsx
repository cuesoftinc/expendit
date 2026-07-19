"use client";

/**
 * MarketingNav — design.md §8.2b variants: on-dark (over hero) /
 * dark-on-light (post-hero scroll, sticky). Link inventory per the
 * marketing nav/footer & theme parity canon (org SKILL.md, 2026-07-19):
 * 4 text links (Features · Pricing · Docs · GitHub) + theme toggle slot +
 * the "Sign in" CTA (/signin). The Solutions dropdown, Star badge, and
 * nav Try Cloud retired with the canon convergence.
 *
 * Tokens only: the on-dark variant scopes `data-theme="dark"` on its own
 * subtree (editorial sections are #0C0C0E in both themes, design.md §2),
 * so every color here stays a token binding.
 */

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface MarketingNavLink {
  label: string;
  href: string;
}

export interface MarketingNavProps {
  /** on-dark: over the hero; dark-on-light: post-hero sticky scroll. */
  variant?: "on-dark" | "dark-on-light";
  /** The 4 canonical text links (Features · Pricing · Docs · GitHub). */
  links?: MarketingNavLink[];
  /** Trailing slot before the Sign in CTA (the theme toggle). */
  trailing?: React.ReactNode;
  signInHref?: string;
  /** Analytics hook for external links (pages.md `github_click`). */
  onLinkClick?: (label: string) => void;
  className?: string;
}

const isExternal = (href: string): boolean => /^https?:\/\//.test(href);

export const MarketingNav: React.FC<MarketingNavProps> = ({
  variant = "on-dark",
  links = [],
  trailing,
  signInHref = "/signin",
  onLinkClick,
  className,
}) => {
  const onDark = variant === "on-dark";

  const itemClass = cn(
    "rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-fast ease-standard",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    "text-text-2 hover:bg-bg-elev hover:text-text",
  );

  return (
    <nav
      aria-label="Marketing"
      data-variant={variant}
      // on-dark: dark token mode scoped to the nav subtree (both themes).
      data-theme={onDark ? "dark" : undefined}
      className={cn(
        "w-full px-6 py-3",
        onDark
          ? "bg-bg-editorial"
          : "sticky top-0 z-sticky border-b border-border bg-bg",
        className,
      )}
    >
      {/* Bar background is full-bleed; content sits in the one centered
          1200px landing container (design.md §2 container pin). */}
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-1">
        <Link
          href="/"
          className="mr-4 rounded text-sm font-semibold tracking-tight text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          expendit
        </Link>

        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            {...(isExternal(link.href)
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
            onClick={onLinkClick ? () => onLinkClick(link.label) : undefined}
            // Text items collapse below md (375w floor keeps logo + CTAs).
            className={cn(itemClass, "hidden md:inline-block")}
          >
            {link.label}
          </a>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {trailing}
          <Link
            href={signInHref}
            className={cn(
              "rounded bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent",
              "transition-colors duration-fast ease-standard hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            )}
          >
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default MarketingNav;
