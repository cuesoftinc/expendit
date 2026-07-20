"use client";

// Scalar API reference embed (X-2) — renders the interactive reference
// from the repo's canonical spec served at /docs/api/openapi.yaml. The
// embed follows the product theme: dark/light comes from ThemeProvider
// (system-resolved), Scalar's own toggle is hidden, and the remote
// default fonts are disabled (self-host ethos: no external runtime
// dependencies) so the reference renders in the app's font stack.
import { useSyncExternalStore } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { useTheme } from "@/design/ThemeProvider";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(listener: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function readSystemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

// Server snapshot: light — Scalar only mounts client-side and the config
// updates on hydration, so this is just the pre-mount default.
function getServerSnapshot(): boolean {
  return false;
}

export function ScalarApiReference() {
  const { preference } = useTheme();
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    readSystemPrefersDark,
    getServerSnapshot,
  );
  const isDark =
    preference === "system" ? systemPrefersDark : preference === "dark";

  return (
    <ApiReferenceReact
      configuration={{
        url: "/docs/api/openapi.yaml",
        darkMode: isDark,
        hideDarkModeToggle: true,
        withDefaultFonts: false,
      }}
    />
  );
}
