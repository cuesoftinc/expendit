"use client";

/**
 * Theme controller — the B9 theme control (and every other toggle) now
 * delegates to the design-layer ThemeProvider, the single source of truth
 * for the `data-theme` override (theme parity canon, 2026-07-19: one
 * provider contract across the ecosystem — data-theme on <html>,
 * localStorage `expendit.theme`, system default when unset). The
 * controller API is kept so existing views stay unchanged.
 */

import {
  resolveTheme,
  useTheme,
  type ThemePreference,
  THEME_STORAGE_KEY,
} from "@/design/ThemeProvider";

export type ThemeSetting = ThemePreference;

export { THEME_STORAGE_KEY };

/** Pure DOM seam kept for compatibility (mirrors the provider's apply):
 * data-theme always carries the RESOLVED theme (contract 2026-07-20). */
export const applyTheme = (theme: ThemeSetting): void => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveTheme(theme);
};

export const useThemeController = () => {
  const { preference, setPreference } = useTheme();
  return { theme: preference, setTheme: setPreference };
};
