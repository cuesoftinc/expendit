/**
 * Tag/Badge — design.md §8.2b: tint neutral / info / warn / error /
 * success / new-accent (MI-14 NEW) · text / count (9+ cap) · sm/md.
 */

import React from "react";
import { cn } from "@/lib/cn";

export type TagTint =
  "neutral" | "info" | "warn" | "error" | "success" | "new-accent";

export interface TagProps {
  tint?: TagTint;
  size?: "sm" | "md";
  /** Count mode: renders the number, capped at 9+. */
  count?: number;
  children?: React.ReactNode;
}

// Figma Tag (node 118:1053): borderless pill, 12% tint fill + tint text.
const TINT_CLASSES: Record<TagTint, string> = {
  neutral: "bg-bg-elev text-text-2",
  info: "bg-info/[0.12] text-info",
  warn: "bg-warn/[0.12] text-warn",
  error: "bg-expense/[0.12] text-expense",
  success: "bg-income/[0.12] text-income",
  "new-accent": "bg-accent/[0.12] text-accent",
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
      "inline-flex items-center rounded-full font-medium tabular-nums",
      TINT_CLASSES[tint],
      size === "sm"
        ? "px-1.5 py-px text-[11px] leading-4"
        : "px-2 py-[3px] text-[13px] leading-4",
    )}
  >
    {count !== undefined ? (count > 9 ? "9+" : count) : children}
  </span>
);

export default Tag;
