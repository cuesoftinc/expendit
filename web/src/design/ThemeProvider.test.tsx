// Theme provider — tri-state contract (ratified 2026-07-20): preference
// light | dark | system persisted at expendit.theme (key absent = system);
// data-theme always carries the RESOLVED theme; system tracks
// prefers-color-scheme live via a matchMedia listener.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setPreference("dark")}>dark</button>
      <button onClick={() => setPreference("light")}>light</button>
      <button onClick={() => setPreference("system")}>system</button>
    </div>
  );
}

// Controllable matchMedia stand-in: the provider attaches ONE module-level
// change listener on first subscribe; `flipSystem` drives it like an OS
// theme change. Installed before the first render in this file so the
// provider binds to it.
let systemMatches = false;
const changeListeners = new Set<() => void>();
function flipSystem(matches: boolean) {
  systemMatches = matches;
  act(() => {
    for (const l of changeListeners) l();
  });
}

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    get matches() {
      return systemMatches;
    },
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, cb: () => void) => changeListeners.add(cb),
    removeEventListener: (_: string, cb: () => void) =>
      changeListeners.delete(cb),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  systemMatches = false;
});

describe("ThemeProvider", () => {
  it("themeInitScript stays in sync with the storage key", async () => {
    const { themeInitScript } = await import("./ThemeProvider");
    expect(themeInitScript).toContain(`"${THEME_STORAGE_KEY}"`);
    expect(THEME_STORAGE_KEY).toBe("expendit.theme");
    // System mode must resolve pre-paint (no FOUC): the script consults
    // prefers-color-scheme and always sets the resolved data-theme.
    expect(themeInitScript).toContain("prefers-color-scheme");
    expect(themeInitScript).toContain("setAttribute");
  });

  it("defaults to system and reports the resolved OS theme", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("pref")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
  });

  it("manual dark override applies the resolved attribute and persists", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("returning to system removes the stored key (absent = system) and re-resolves", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "light" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await userEvent.click(screen.getByRole("button", { name: "system" }));
    // Key absent = system — the cross-product storage convention; the
    // attribute stays populated with the RESOLVED theme.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(screen.getByTestId("pref")).toHaveTextContent("system");
  });

  it("system mode tracks prefers-color-scheme changes live", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "system" }));
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    flipSystem(true); // OS switches to dark
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    flipSystem(false); // and back
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("explicit preferences ignore OS theme changes", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "dark" }));
    flipSystem(false);
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("keeps working when storage is blocked (in-memory fallback, Codex round 3)", async () => {
    const setSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const getSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    try {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      await userEvent.click(screen.getByRole("button", { name: "dark" }));
      // The attribute applied AND the store snapshot follows — the toggle
      // can flip back even though nothing persisted.
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(screen.getByTestId("pref")).toHaveTextContent("dark");
      await userEvent.click(screen.getByRole("button", { name: "light" }));
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(screen.getByTestId("pref")).toHaveTextContent("light");
    } finally {
      setSpy.mockRestore();
      getSpy.mockRestore();
      // Reset the module-level fallback for later tests.
      window.localStorage.clear();
    }
  });

  it("write-blocked storage (readable, setItem throws) still flips the store (Codex round 4)", async () => {
    const setSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    try {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      await userEvent.click(screen.getByRole("button", { name: "dark" }));
      // getItem works and returns null — but the failed write means the
      // in-session preference must win, or the toggle sticks.
      expect(screen.getByTestId("pref")).toHaveTextContent("dark");
      await userEvent.click(screen.getByRole("button", { name: "light" }));
      expect(screen.getByTestId("pref")).toHaveTextContent("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    } finally {
      setSpy.mockRestore();
      window.localStorage.clear();
    }
  });

  it("system reset clears the in-memory fallback too", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "dark" }));
    await userEvent.click(screen.getByRole("button", { name: "system" }));
    expect(screen.getByTestId("pref")).toHaveTextContent("system");
    // data-theme stays populated with the RESOLVED theme (light OS here).
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
