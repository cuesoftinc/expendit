import React from "react";
import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@/design/ThemeProvider";
import { applyTheme, useThemeController } from "./use-theme";

// The controller is now an adapter over the design-layer ThemeProvider
// (theme parity canon, 2026-07-19) — same public API, one source of truth.
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(ThemeProvider, null, children);

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("useThemeController (B9 theme control)", () => {
  it("setTheme('dark') sets data-theme and persists", async () => {
    const { result } = renderHook(() => useThemeController(), { wrapper });
    act(() => result.current.setTheme("dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("expendit.theme")).toBe("dark");
    await waitFor(() => expect(result.current.theme).toBe("dark"));
  });

  it("system removes the stored key; data-theme carries the resolved OS theme", () => {
    const { result } = renderHook(() => useThemeController(), { wrapper });
    act(() => result.current.setTheme("dark"));
    act(() => result.current.setTheme("system"));
    // Contract 2026-07-20: data-theme always carries the RESOLVED theme
    // (light here — no matchMedia dark in jsdom); key absent = system.
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("expendit.theme")).toBeNull();
  });

  it("reads a stored preference (provider store is localStorage-backed)", async () => {
    localStorage.setItem("expendit.theme", "light");
    const { result } = renderHook(() => useThemeController(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe("light"));
  });

  it("applyTheme is a pure DOM seam (applies the resolved theme)", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyTheme("system");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
