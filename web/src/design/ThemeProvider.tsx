"use client";

/**
 * Theme provider — manual light/dark override with system default
 * (web-implementation.md §3: light on :root, dark on [data-theme="dark"],
 * prefers-color-scheme honored with manual override). Ported from the
 * apparule contract per the marketing nav/footer & theme parity canon
 * (org SKILL.md, 2026-07-19) — data-theme on <html>, localStorage key
 * `expendit.theme`, "system" default when unset.
 *
 * The preference lives in an external module store (localStorage-backed,
 * read via useSyncExternalStore) so no state syncs through effects; a tiny
 * inline script in the root layout applies the persisted override before
 * first paint to avoid a theme flash.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "expendit.theme";

// -- external preference store ----------------------------------------------

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

// In-memory fallback: when storage is blocked (private mode, privacy
// policies, full quota), the last set preference still drives the store —
// otherwise a toggle click applied data-theme but the snapshot stayed
// "system" and the control could never switch back (Codex rounds 3–4 on
// PR #209). Readable+writable storage stays the source of truth; after a
// FAILED write the stored value is stale, so the in-session preference
// wins until a write succeeds again.
let memoryPreference: ThemePreference = "system";
let storageDesynced = false;

function readStoredPreference(): ThemePreference {
  try {
    if (storageDesynced) return memoryPreference;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    // Readable, in-sync storage is the source of truth (null = none).
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Storage unavailable — the in-session preference stands.
    return memoryPreference;
  }
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

function applyPreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

// -- context ------------------------------------------------------------------

interface ThemeContextValue {
  /** The user's stored preference (may be "system"). */
  preference: ThemePreference;
  /** Set + persist the preference; "system" clears the override. */
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribe,
    readStoredPreference,
    getServerSnapshot,
  );

  const setPreference = useCallback((next: ThemePreference) => {
    memoryPreference = next;
    applyPreference(next);
    try {
      if (next === "system") {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      }
      storageDesynced = false;
    } catch {
      // non-fatal: the in-session preference drives the store instead.
      storageDesynced = true;
    }
    emit();
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

/**
 * Pre-paint theme bootstrap (inlined by the root layout). A fully static
 * string — no runtime code construction (CodeQL js/bad-code-sanitization);
 * the literal storage key must match THEME_STORAGE_KEY (unit-tested).
 */
export const themeInitScript =
  '(function(){try{var t=localStorage.getItem("expendit.theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();';
