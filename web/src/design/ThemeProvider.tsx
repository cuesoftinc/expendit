"use client";

/**
 * Theme provider — tri-state light | dark | system (web-implementation.md
 * §3; theme contract ratified 2026-07-20, identical across apparule,
 * expendit and upstat):
 *
 * - `preference` is what the user chose; persisted at `expendit.theme`
 *   ("light"/"dark" stored explicitly; KEY ABSENT = system — the
 *   cross-product storage convention).
 * - `data-theme` on <html> always carries the RESOLVED theme ("light" or
 *   "dark"): explicit preferences resolve to themselves; system resolves
 *   via `prefers-color-scheme` and tracks it LIVE (matchMedia listener —
 *   an OS theme flip updates data-theme without a reload).
 * - tokens.css keeps its media-query fallback for the pre-JS/no-JS case;
 *   with JS the attribute is authoritative.
 *
 * The preference lives in an external module store (localStorage-backed,
 * read via useSyncExternalStore) so no state syncs through effects; a tiny
 * inline script in the root layout applies the resolved theme before first
 * paint (no FOUC in any mode, including system).
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
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "expendit.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// -- external preference store ----------------------------------------------

const listeners = new Set<() => void>();

// System tracking: one module-level matchMedia listener, attached lazily on
// first subscription (client only), kept for the app lifetime.
let systemListenerAttached = false;

function onSystemChange(): void {
  // Only the system preference re-resolves on an OS flip.
  if (readStoredPreference() === "system") {
    applyResolved(resolveTheme("system"));
    emit();
  }
}

function ensureSystemListener(): void {
  if (systemListenerAttached || typeof window === "undefined") return;
  try {
    window.matchMedia(DARK_QUERY).addEventListener("change", onSystemChange);
    systemListenerAttached = true;
  } catch {
    // matchMedia unavailable — system just won't track live
  }
}

function subscribe(listener: () => void): () => void {
  ensureSystemListener();
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

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

/** Resolve a preference to the concrete theme ("system" → the OS theme). */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark() ? "dark" : "light";
}

function readResolvedTheme(): ResolvedTheme {
  return resolveTheme(readStoredPreference());
}

function getServerPreference(): ThemePreference {
  return "system";
}

function getServerResolved(): ResolvedTheme {
  return "light";
}

function applyResolved(theme: ResolvedTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

// -- context ------------------------------------------------------------------

interface ThemeContextValue {
  /** The user's stored preference (may be "system"). */
  preference: ThemePreference;
  /** The concrete theme currently applied ("system" resolved live). */
  resolvedTheme: ResolvedTheme;
  /** Set + persist the preference; "system" removes the stored key. */
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribe,
    readStoredPreference,
    getServerPreference,
  );
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    readResolvedTheme,
    getServerResolved,
  );

  const setPreference = useCallback((next: ThemePreference) => {
    memoryPreference = next;
    applyResolved(resolveTheme(next));
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
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
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
 * Applies the RESOLVED theme: stored light/dark verbatim, otherwise the
 * OS preference — so system mode paints correctly on first frame (no FOUC).
 */
export const themeInitScript =
  '(function(){try{var t=localStorage.getItem("expendit.theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();';
