"use client";

/**
 * ThemeToggle — the ecosystem theme control (marketing nav + dashboard
 * chrome; theme contract ratified 2026-07-20, identical across apparule,
 * expendit and upstat): one icon button cycling light → dark → system
 * with a distinct icon per mode (sun / moon / monitor) and an aria-label
 * announcing the ACTIVE mode plus the mode a press switches to.
 */

import React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme, type ThemePreference } from "@/design/ThemeProvider";
import { cn } from "@/lib/cn";

/** light → dark → system → light. */
export const THEME_CYCLE: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export const THEME_ICONS: Record<ThemePreference, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/** Accessible name: announces the active mode and the next one. */
export function themeToggleLabel(preference: ThemePreference): string {
  return `Theme: ${preference} — switch to ${THEME_CYCLE[preference]}`;
}

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { preference, setPreference } = useTheme();
  const Icon = THEME_ICONS[preference];
  return (
    <button
      type="button"
      data-testid="theme-toggle"
      aria-label={themeToggleLabel(preference)}
      onClick={() => setPreference(THEME_CYCLE[preference])}
      className={cn(
        "rounded p-1.5 text-text-2 transition-colors duration-fast ease-standard",
        "hover:bg-bg-elev hover:text-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <Icon aria-hidden className="h-4 w-4" />
    </button>
  );
};

export default ThemeToggle;
