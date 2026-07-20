"use client";

// Scalar API reference embed (X-2) — renders the interactive reference
// from the repo's canonical spec served at /docs/api/openapi.yaml. The
// embed follows the product theme contract (2026-07-20): Scalar's dark
// mode is FORCED to the resolved theme from ThemeProvider (system tracks
// the OS live) via `forceDarkModeState` — `darkMode` alone is only an
// initial hint and loses to Scalar's internal state. Scalar's own theme
// toggle is hidden (ours is the master) and the remote default fonts are
// disabled (self-host ethos: no external runtime dependencies).
import { useSyncExternalStore } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { useTheme } from "@/design/ThemeProvider";

// Hydration probe: false for the server/hydration render, true after.
const emptySubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ScalarApiReference() {
  const { resolvedTheme } = useTheme();

  // Scalar reads `forceDarkModeState` ONCE at creation (a frozen override —
  // `updateConfiguration` never re-applies it), so: (1) skip the hydration
  // frame, where the provider still reports the server snapshot, so the
  // first create sees the real resolved theme; (2) remount on resolved-theme
  // changes (`key`) so every theme flip re-creates the app with the right
  // forced state — configuration only, no reaching into Scalar internals.
  const hydrated = useHydrated();
  if (!hydrated) return null;

  return (
    <ApiReferenceReact
      key={resolvedTheme}
      configuration={{
        url: "/docs/api/openapi.yaml",
        forceDarkModeState: resolvedTheme,
        hideDarkModeToggle: true,
        withDefaultFonts: false,
      }}
    />
  );
}
