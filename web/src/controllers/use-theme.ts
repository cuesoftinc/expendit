"use client";

/**
 * Theme controller — the B9 theme control sets `data-theme` on <html>
 * (web-implementation.md §3: light on :root, dark on [data-theme="dark"],
 * prefers-color-scheme honored with manual override — "system" removes
 * the attribute so the OS preference applies).
 */

import { useCallback, useEffect, useState } from "react";

export type ThemeSetting = "light" | "dark" | "system";

const THEME_KEY = "expendit.theme";

const readStored = (): ThemeSetting => {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
};

export const applyTheme = (theme: ThemeSetting): void => {
  if (typeof document === "undefined") return;
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
};

export const useThemeController = () => {
  const [theme, setThemeState] = useState<ThemeSetting>("system");

  useEffect(() => {
    // Apply the stored preference on mount (client-only).
    queueMicrotask(() => {
      const stored = readStored();
      setThemeState(stored);
      applyTheme(stored);
    });
  }, []);

  const setTheme = useCallback((next: ThemeSetting) => {
    setThemeState(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      if (next === "system") window.localStorage.removeItem(THEME_KEY);
      else window.localStorage.setItem(THEME_KEY, next);
    }
  }, []);

  return { theme, setTheme };
};
