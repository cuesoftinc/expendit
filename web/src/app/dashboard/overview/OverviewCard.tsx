import React from "react";
import { cn } from "@/lib/cn";

interface OverviewCardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  fill?: boolean;
  className?: string;
}

export const OverviewCard: React.FC<OverviewCardProps> = ({
  title,
  children,
  action,
  fill,
  className,
}) => (
  <section
    className={cn(
      "rounded border border-border bg-bg",
      fill && "lg:flex lg:flex-col",
      className,
    )}
  >
    <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <h2 className="text-[13px] font-medium text-text">{title}</h2>
      {action}
    </header>
    <div
      className={cn("p-4", fill && "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col")}
    >
      {children}
    </div>
  </section>
);
