"use client";

/**
 * MarketingNav — design.md §8.2b: on-dark (over hero) / dark-on-light
 * (post-hero scroll, sticky) · item + Solutions dropdown · GitHub badge
 * (neutral "Star", no count — as built 2026-07-18) · Sign in + Try Cloud
 * CTAs. The GitHub mark is an approved brand glyph (icon/brand-github,
 * design.md §8.1 — Lucide's `github` is deprecated), inline SVG.
 *
 * Tokens only: the on-dark variant scopes `data-theme="dark"` on its own
 * subtree (editorial sections are #0C0C0E in both themes, design.md §2),
 * so every color here stays a token binding.
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MarketingNavLink {
  label: string;
  href: string;
}

export interface MarketingNavProps {
  /** on-dark: over the hero; dark-on-light: post-hero sticky scroll. */
  variant?: "on-dark" | "dark-on-light";
  links?: MarketingNavLink[];
  solutions?: MarketingNavLink[];
  githubHref?: string;
  onSignIn?: () => void;
  onTryCloud?: () => void;
  className?: string;
}

const GitHubMark: React.FC<{ className?: string }> = ({ className }) => (
  // Brand glyph (icon/brand-github) — not Lucide; inherits currentColor.
  <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

export const MarketingNav: React.FC<MarketingNavProps> = ({
  variant = "on-dark",
  links = [],
  solutions = [],
  githubHref = "https://github.com/cuesoftinc/expendit",
  onSignIn,
  onTryCloud,
  className,
}) => {
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const solutionsRef = useRef<HTMLDivElement>(null);
  const onDark = variant === "on-dark";

  useEffect(() => {
    if (!solutionsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!solutionsRef.current?.contains(event.target as Node)) {
        setSolutionsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSolutionsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [solutionsOpen]);

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
        "flex w-full items-center gap-1 px-6 py-3",
        onDark
          ? "bg-bg-editorial"
          : "sticky top-0 z-sticky border-b border-border bg-bg",
        className,
      )}
    >
      <a
        href="/"
        className="mr-4 rounded text-sm font-semibold tracking-tight text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        expendit
      </a>

      {solutions.length > 0 ? (
        <div ref={solutionsRef} className="relative">
          <button
            type="button"
            aria-expanded={solutionsOpen}
            aria-haspopup="menu"
            onClick={() => setSolutionsOpen((state) => !state)}
            className={cn(itemClass, "inline-flex items-center gap-1")}
          >
            Solutions
            <ChevronDown
              aria-hidden
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-fast ease-standard",
                solutionsOpen && "rotate-180",
              )}
            />
          </button>
          {solutionsOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-full z-dropdown mt-1 w-56 rounded border border-border bg-bg py-1 shadow-lg"
            >
              {solutions.map((item) => (
                <a
                  key={item.href}
                  role="menuitem"
                  href={item.href}
                  className="block px-3 py-1.5 text-[13px] text-text transition-colors duration-fast ease-standard hover:bg-bg-elev"
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {links.map((link) => (
        <a key={link.href} href={link.href} className={itemClass}>
          {link.label}
        </a>
      ))}

      <div className="ml-auto flex items-center gap-2">
        {/* GitHub badge — neutral "Star", no count (as built). */}
        <a
          href={githubHref}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-[13px] font-medium text-text",
            "transition-colors duration-fast ease-standard hover:bg-bg-elev",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          )}
        >
          <GitHubMark className="h-3.5 w-3.5" />
          Star
        </a>
        <button type="button" onClick={onSignIn} className={itemClass}>
          Sign in
        </button>
        <button
          type="button"
          onClick={onTryCloud}
          className={cn(
            "rounded bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent",
            "transition-colors duration-fast ease-standard hover:opacity-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          )}
        >
          Try Cloud
        </button>
      </div>
    </nav>
  );
};

export default MarketingNav;
