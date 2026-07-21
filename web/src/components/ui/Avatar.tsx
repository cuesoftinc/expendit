/**
 * Avatar — design.md §8.2b: image / initials / icon fallback · xs/sm/md.
 */

import React from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: "xs" | "sm" | "md";
}

const SIZE_CLASSES = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[13px]",
} as const;

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = "sm" }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium",
      // Figma: initials disc = 15% accent tint + accent text (no border);
      // image/icon fallbacks stay neutral.
      !src && name
        ? "bg-accent/[0.15] text-accent-text"
        : "border border-border bg-bg-elev text-text-2",
      SIZE_CLASSES[size],
    )}
  >
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element -- avatars are tiny; next/image is overkill here
      <img
        src={src}
        alt={name ?? "avatar"}
        className="h-full w-full object-cover"
      />
    ) : name ? (
      <span aria-hidden>{initials(name)}</span>
    ) : (
      <User aria-hidden className="h-3/5 w-3/5" />
    )}
  </span>
);

export default Avatar;
