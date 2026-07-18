"use client";

/**
 * AppNav / NavItem — design.md §8.2b: item default / hover / active /
 * with-badge-count (MI-5) · group label · expanded 240px / collapsed 64px
 * icon rail · org-switcher slot top.
 */

import React, { createContext, useContext } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import Tag from "./Tag";

const NavCollapsedContext = createContext(false);

export interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  /** MI-5: anomaly count badge. */
  badgeCount?: number;
  href?: string;
  onClick?: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({
  icon: Icon,
  label,
  active = false,
  badgeCount,
  href,
  onClick,
}) => {
  const collapsed = useContext(NavCollapsedContext);
  const className = cn(
    "group/nav-item relative flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] font-medium",
    "transition-colors duration-fast ease-standard",
    active
      ? "bg-accent/10 text-accent"
      : "text-text-2 hover:bg-bg-elev hover:text-text",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    collapsed && "justify-center px-0",
  );
  const content = (
    <>
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {!collapsed ? (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      ) : null}
      {badgeCount !== undefined && badgeCount > 0 ? (
        <span className={cn(collapsed && "absolute -right-0.5 -top-0.5")}>
          <Tag tint="warn" count={badgeCount} />
        </span>
      ) : null}
    </>
  );
  return href ? (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={onClick}
      className={className}
    >
      {content}
    </a>
  ) : (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  );
};

/** Group label — hidden on the collapsed rail. */
export const NavGroupLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const collapsed = useContext(NavCollapsedContext);
  if (collapsed) return null;
  return (
    <div className="px-2.5 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-text-2">
      {children}
    </div>
  );
};

export interface AppNavProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Org-switcher slot, pinned top. */
  orgSwitcher?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const AppNav: React.FC<AppNavProps> = ({
  collapsed = false,
  onCollapsedChange,
  orgSwitcher,
  children,
  footer,
  className,
}) => (
  <NavCollapsedContext.Provider value={collapsed}>
    <nav
      aria-label="Primary"
      data-collapsed={collapsed}
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-bg",
        "transition-[width] duration-base ease-standard motion-reduce:transition-none",
        collapsed ? "w-16" : "w-60",
        className,
      )}
    >
      {orgSwitcher ? (
        <div className={cn("border-b border-border p-2", collapsed && "px-1")}>
          {orgSwitcher}
        </div>
      ) : null}
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">{children}</div>
      <div className="border-t border-border p-2">
        {footer}
        {onCollapsedChange ? (
          <button
            type="button"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] text-text-2",
              "transition-colors duration-fast ease-standard hover:bg-bg-elev hover:text-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose aria-hidden className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        ) : null}
      </div>
    </nav>
  </NavCollapsedContext.Provider>
);

export default AppNav;
