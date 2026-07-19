// Theme provider: manual override sets data-theme + persists; "system"
// clears the attribute (tokens.css then follows prefers-color-scheme).
// Ported with the apparule contract (theme parity canon, 2026-07-19).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { preference, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <button onClick={() => setPreference("dark")}>dark</button>
      <button onClick={() => setPreference("light")}>light</button>
      <button onClick={() => setPreference("system")}>system</button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeProvider", () => {
  it("themeInitScript stays in sync with the storage key", async () => {
    const { themeInitScript } = await import("./ThemeProvider");
    expect(themeInitScript).toContain(`"${THEME_STORAGE_KEY}"`);
    expect(THEME_STORAGE_KEY).toBe("expendit.theme");
  });

  it("defaults to system (no data-theme attribute)", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("pref")).toHaveTextContent("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("manual dark override sets the attribute and persists", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("returning to system clears override + storage", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "light" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await userEvent.click(screen.getByRole("button", { name: "system" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
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
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
