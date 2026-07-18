/**
 * Tag/Badge — design.md §8.2b: tint neutral / info / warn / error /
 * success / new-accent (MI-14 NEW) · text / count (9+ cap) · sm/md.
 */

import React from "react";
import { cn } from "@/lib/cn";

export type TagTint =
  | "neutral"
  | "info"
  | "warn"
  | "error"
  | "success"
  | "new-accent";

export interface TagProps {
  tint?: TagTint;
  size?: "sm" | "md";
  /** Count mode: renders the number, capped at 9+. */
  count?: number;
  children?: React.ReactNode;
}

const TINT_CLASSES: Record<TagTint, string> = {
  neutral: "border-border bg-bg-elev text-text-2",
  info: "border-info/40 bg-info/10 text-info",
  warn: "border-warn/40 bg-warn/10 text-warn",
  error: "border-expense/40 bg-expense/10 text-expense",
  success: "border-income/40 bg-income/10 text-income",
  "new-accent": "border-accent/40 bg-accent/10 text-accent",
};

export const Tag: React.FC<TagProps> = ({
  tint = "neutral",
  size = "sm",
  count,
  children,
}) => (
  <span
    data-tint={tint}
    className={cn(
      "inline-flex items-center rounded border font-medium tabular-nums",
      TINT_CLASSES[tint],
      size === "sm" ? "px-1.5 py-0 text-[11px]" : "px-2 py-0.5 text-[13px]",
    )}
  >
    {count !== undefined ? (count > 9 ? "9+" : count) : children}
  </span>
);

export default Tag;
