/**
 * EditorialCard — design.md §8.2b: pillar (A4) / community (A9) · default /
 * hover (2px lift + accent underline draw) · light/dark section (dark via
 * the section's `data-theme="dark"` scope, not a prop).
 */

import React from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface EditorialCardProps {
  kind?: "pillar" | "community";
  eyebrow?: string;
  title: string;
  body: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Accent CTA line at the card foot (Figma A4/A9 instances). */
  cta?: string;
  className?: string;
}

export const EditorialCard: React.FC<EditorialCardProps> = ({
  kind = "pillar",
  eyebrow,
  title,
  body,
  href,
  icon: Icon,
  cta,
  className,
}) => {
  const Root: React.ElementType = href ? "a" : "div";
  return (
    <Root
      {...(href ? { href } : {})}
      data-kind={kind}
      className={cn(
        "group block rounded border border-border bg-bg-elev p-6",
        "transition-transform duration-base ease-standard",
        // Hover: 2px lift; reduced motion keeps the card still.
        "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        href &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "mb-4 flex h-9 w-9 items-center justify-center rounded-full",
            kind === "community"
              ? "bg-info/10 text-info"
              : "bg-accent/10 text-accent",
          )}
        >
          {/* 24px — h-4.5 was outside the v3 spacing scale, so the lucide
              default (24) is what shipped; keep the rendered size (v4
              resolves fractional spacing, which would silently shrink it). */}
          <Icon aria-hidden className="h-6 w-6" />
        </span>
      ) : null}
      {eyebrow ? (
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-2">
          {eyebrow}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-text">
        {/* Accent underline draws on hover. */}
        <span className="bg-gradient-to-r from-accent to-accent bg-[length:0%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-base ease-standard group-hover:bg-[length:100%_2px] motion-reduce:transition-none">
          {title}
        </span>
        {href ? (
          <ArrowUpRight
            aria-hidden
            className="ml-1 inline h-4 w-4 text-text-2 transition-colors duration-fast ease-standard group-hover:text-accent"
          />
        ) : null}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p>
      {cta ? (
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent">
          {cta}
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </Root>
  );
};

export default EditorialCard;
