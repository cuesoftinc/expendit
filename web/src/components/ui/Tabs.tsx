"use client";

/**
 * Tabs + TabItem — design.md §8.2b: kind underline (app) / pill
 * (marketing) · TabItem states default / hover / active / disabled.
 * Radix Tabs supplies roving focus + ARIA (reuse policy).
 */

import React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export type TabsKind = "underline" | "pill";

export interface TabItemProps {
  value: string;
  kind?: TabsKind;
  disabled?: boolean;
  children: React.ReactNode;
}

export const TabItem: React.FC<TabItemProps> = ({
  value,
  kind = "underline",
  disabled = false,
  children,
}) => (
  <RadixTabs.Trigger
    value={value}
    disabled={disabled}
    className={cn(
      "text-[13px] font-medium transition-colors duration-fast ease-standard",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      "disabled:cursor-not-allowed disabled:opacity-60",
      kind === "underline"
        ? cn(
            "-mb-px border-b-2 border-transparent px-3 py-2 text-text-2",
            "hover:text-text data-[state=active]:border-accent data-[state=active]:text-text",
          )
        : cn(
            "rounded-full px-3 py-1 text-text-2",
            "hover:text-text data-[state=active]:bg-bg-elev data-[state=active]:text-text",
          ),
    )}
  >
    {children}
  </RadixTabs.Trigger>
);

export interface TabsProps {
  value: string;
  onValueChange?: (value: string) => void;
  kind?: TabsKind;
  "aria-label"?: string;
  /** TabItem triggers. */
  items: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  kind = "underline",
  "aria-label": ariaLabel,
  items,
  children,
  className,
}) => (
  <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
    <RadixTabs.List
      aria-label={ariaLabel}
      className={cn(
        "flex items-center",
        kind === "underline" ? "gap-1 border-b border-border" : "gap-1.5",
      )}
    >
      {items}
    </RadixTabs.List>
    {children}
  </RadixTabs.Root>
);

/** Content panel for a tab value (thin Radix pass-through). */
export const TabPanel: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, children, className }) => (
  <RadixTabs.Content value={value} className={cn("pt-3 focus:outline-none", className)}>
    {children}
  </RadixTabs.Content>
);

export default Tabs;
