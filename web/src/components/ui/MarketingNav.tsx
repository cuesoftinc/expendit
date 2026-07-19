"use client";

/**
 * MarketingNav — design.md §8.2b variants: on-dark (over hero) /
 * dark-on-light (post-hero scroll, sticky). Composition per the revised
 * parity canon (2026-07-19): 4 text links where the GitHub item renders
 * as a compact star badge (live count, neutral "Star" in TEST_MODE or on
 * fetch failure — never hardcoded) + theme toggle + "Sign in" text link +
 * the "Try Cloud" primary CTA (→ /signin). Below md the bar keeps the
 * Try Cloud CTA beside the hamburger; the disclosure panel carries the
 * 4 links + ThemeToggle + Sign in (canon revision 2026-07-19 — the
 * conversion CTA never hides behind the menu).
 *
 * Tokens only: the on-dark variant scopes `data-theme="dark"` on its own
 * subtree (editorial sections are #0C0C0E in both themes, design.md §2),
 * so every color here stays a token binding.
 */

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MarketingNavLink {
  label: string;
  href: string;
  /** Render as the compact GitHub star badge (star glyph + count). */
  star?: boolean;
}

export interface MarketingNavProps {
  /** on-dark: over the hero; dark-on-light: post-hero sticky scroll. */
  variant?: "on-dark" | "dark-on-light";
  /** The 4 canonical links (GitHub carries `star: true`). */
  links?: MarketingNavLink[];
  /** Trailing slot before the CTAs (the theme toggle). */
  trailing?: React.ReactNode;
  /** Live stargazer count — null/undefined renders the neutral "Star". */
  starCount?: number | null;
  signInHref?: string;
  tryCloudHref?: string;
  /** Analytics hook for external links (pages.md `github_click`). */
  onLinkClick?: (label: string) => void;
  /** Analytics hook for the Try Cloud CTA (`try_cloud_click`). */
  onTryCloud?: () => void;
  className?: string;
}

const isExternal = (href: string): boolean => /^https?:\/\//.test(href);

const GitHubMark: React.FC<{ className?: string }> = ({ className }) => (
  // Brand glyph (icon/brand-github) — not Lucide; inherits currentColor.
  <svg
    viewBox="0 0 16 16"
    aria-hidden
    className={className}
    fill="currentColor"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

export const MarketingNav: React.FC<MarketingNavProps> = ({
  variant = "on-dark",
  links = [],
  trailing,
  starCount = null,
  signInHref = "/signin",
  tryCloudHref = "/signin",
  onLinkClick,
  onTryCloud,
  className,
}) => {
  const onDark = variant === "on-dark";
  // Mobile canon (org SKILL.md, 2026-07-19): below md the text links
  // collapse into a hamburger disclosure — never display:none with no
  // fallback. The panel carries the same 4 links + theme toggle + Sign in.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Mobile canon (revised 2026-07-19): the bar keeps logo · Try Cloud ·
  // hamburger below md — the primary CTA stays visible; only the text
  // links + ThemeToggle + Sign in collapse into the disclosure panel.

  const itemClass = cn(
    "rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-fast ease-standard",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    "text-text-2 hover:bg-bg-elev hover:text-text",
  );

  // Compact below md so logo · CTA · hamburger fit the 390 bar.
  const ctaClass = cn(
    "rounded bg-accent px-2.5 py-1.5 text-[13px] font-medium text-on-accent md:px-3",
    "transition-colors duration-fast ease-standard hover:opacity-90",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  );

  const renderLink = (
    link: MarketingNavLink,
    extraClass: string,
    onNavigate?: () => void,
  ) =>
    link.star ? (
      // Compact star badge — live count, neutral "Star" when unknown
      // (TEST_MODE / fetch failure); the count is never hardcoded.
      <a
        key={link.label}
        href={link.href}
        target="_blank"
        rel="noreferrer"
        aria-label="Star cuesoftinc/expendit on GitHub"
        onClick={() => {
          onLinkClick?.(link.label);
          onNavigate?.();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-[13px] font-medium text-text",
          "transition-colors duration-fast ease-standard hover:bg-bg-elev",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          extraClass,
        )}
      >
        <GitHubMark className="h-3.5 w-3.5" />
        Star
        {typeof starCount === "number" ? (
          <span className="tabular-nums text-text-2">
            {starCount.toLocaleString("en-NG")}
          </span>
        ) : null}
      </a>
    ) : (
      <a
        key={link.label}
        href={link.href}
        {...(isExternal(link.href)
          ? { target: "_blank", rel: "noreferrer" }
          : {})}
        onClick={() => {
          onLinkClick?.(link.label);
          onNavigate?.();
        }}
        className={cn(itemClass, extraClass)}
      >
        {link.label}
      </a>
    );

  return (
    <nav
      aria-label="Marketing"
      data-variant={variant}
      // on-dark: dark token mode scoped to the nav subtree (both themes).
      data-theme={onDark ? "dark" : undefined}
      className={cn(
        "relative w-full px-6 py-3",
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

        {links.map((link) =>
          renderLink(
            link,
            // The star badge is a flex row — md:inline-block would stack
            // the glyph over the label.
            link.star ? "hidden md:inline-flex" : "hidden md:inline-block",
          ),
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-2 md:flex">
            {trailing}
            <Link href={signInHref} className={itemClass}>
              Sign in
            </Link>
          </span>
          {/* Always visible — compact padding keeps the 390 bar overflow-free. */}
          <Link
            href={tryCloudHref}
            className={cn(ctaClass, "px-2.5 md:px-3")}
            onClick={onTryCloud}
          >
            Try Cloud
          </Link>

          {/* Mobile disclosure trigger. */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              "rounded p-1.5 text-text-2 md:hidden",
              "transition-colors duration-fast ease-standard hover:bg-bg-elev hover:text-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            )}
          >
            {menuOpen ? (
              <X aria-hidden className="h-5 w-5" />
            ) : (
              <Menu aria-hidden className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id={menuId}
          className={cn(
            "absolute inset-x-0 top-full z-dropdown border-b border-border bg-bg px-6 py-3 md:hidden",
            onDark && "border-t border-t-border",
          )}
        >
          <div className="flex flex-col gap-1">
            {links.map((link) =>
              renderLink(link, link.star ? "self-start" : "block", () =>
                setMenuOpen(false),
              ),
            )}
            {/* No Try Cloud row — the bar CTA stays visible beside the
                hamburger (canon revision 2026-07-19, no duplication). */}
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-3">
              {trailing}
              <Link
                href={signInHref}
                className={itemClass}
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
};

export default MarketingNav;
