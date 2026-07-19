"use client";

/**
 * Dashboard page header — shared screen chrome for the Part B templates:
 * display-type title (design.md §2), optional description, right-aligned
 * actions slot.
 */

import React from "react";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => (
  <header
    className={cn(
      // flex-wrap: at narrow viewports the actions cluster wraps under
      // the title instead of pushing the page wide (mobile canon).
      "mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
      className,
    )}
  >
    <div>
      <h1 className="font-display text-xl font-semibold tracking-tight text-text">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-[13px] text-text-2">{description}</p>
      ) : null}
    </div>
    {actions ? (
      <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
    ) : null}
  </header>
);

export default PageHeader;
