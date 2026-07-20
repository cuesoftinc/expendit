"use client";

/**
 * RouteTabs — the underline tab idiom (design.md §8.2b) where every tab
 * is a REAL link to a sub-route. Accessible routed-tabs pattern:
 * role=tablist container, link tabs with aria-selected + aria-current
 * ("page") on the active route, roving tabindex with arrow/Home/End
 * focus movement (manual activation — Enter/Space follow the link).
 * The active route's content renders as the labelled tabpanel.
 *
 * The bar scrolls horizontally within the viewport on narrow screens
 * (responsive canon) instead of pushing the document wide.
 */

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface RouteTabItem {
  href: string;
  label: string;
}

/** Stable DOM id for a tab link, so the panel can point back at it. */
const tabId = (href: string) =>
  `route-tab-${href.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

export interface RouteTabsProps {
  tabs: RouteTabItem[];
  "aria-label": string;
  className?: string;
  /** Extra classes for the tabpanel wrapper (e.g. a pane max-width). */
  paneClassName?: string;
  /** Active sub-route content, rendered as the labelled tabpanel. */
  children?: React.ReactNode;
}

export const RouteTabs: React.FC<RouteTabsProps> = ({
  tabs,
  "aria-label": ariaLabel,
  className,
  paneClassName,
  children,
}) => {
  const pathname = usePathname() ?? "";
  const listRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const active = tabs.find((tab) => isActive(tab.href));
  // Roving focus falls back to the first tab when no route matches.
  const rovingHref = active?.href ?? tabs[0]?.href;

  // WAI-ARIA tabs keyboard contract, adapted for links: arrows move
  // focus between tabs (wrapping), Home/End jump; activation stays
  // manual so focus travel never triggers a navigation.
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLAnchorElement>('[role="tab"]') ??
        [],
    );
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    const from = current === -1 ? 0 : current;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowRight"
            ? (from + 1) % items.length
            : (from - 1 + items.length) % items.length;
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        // overflow-x-auto: on narrow viewports the bar scrolls inside
        // the viewport (mobile canon — no document side-scroll).
        className="flex items-end gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab) => {
          const selected = active?.href === tab.href;
          return (
            <Link
              key={tab.href}
              id={tabId(tab.href)}
              role="tab"
              href={tab.href}
              aria-selected={selected}
              aria-current={selected ? "page" : undefined}
              tabIndex={tab.href === rovingHref ? 0 : -1}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2",
                "text-[13px] font-medium transition-colors duration-fast ease-standard",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "border-accent text-text"
                  : "border-transparent text-text-2 hover:text-text",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div
        role="tabpanel"
        aria-labelledby={active ? tabId(active.href) : undefined}
        className={cn("pt-4", paneClassName)}
      >
        {children}
      </div>
    </div>
  );
};

export default RouteTabs;
