"use client";

/**
 * ThemeToggle — the ecosystem theme control (marketing nav + dashboard
 * chrome; theme parity canon, org SKILL.md 2026-07-19). Mirrors the
 * apparule contract: one icon button, Sun on dark / Moon otherwise,
 * flips the ThemeProvider preference between light and dark.
 */

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/design/ThemeProvider";
import { cn } from "@/lib/cn";

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { preference, setPreference } = useTheme();
  const nextTheme = preference === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      data-testid="theme-toggle"
      aria-label={`Switch to ${nextTheme} theme`}
      onClick={() => setPreference(nextTheme)}
      className={cn(
        "rounded p-1.5 text-text-2 transition-colors duration-fast ease-standard",
        "hover:bg-bg-elev hover:text-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      {preference === "dark" ? (
        <Sun aria-hidden className="h-4 w-4" />
      ) : (
        <Moon aria-hidden className="h-4 w-4" />
      )}
    </button>
  );
};

export default ThemeToggle;
