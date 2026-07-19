import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { applyTheme, useThemeController } from "./use-theme";

describe("useThemeController (B9 theme control)", () => {
  it("setTheme('dark') sets data-theme and persists", async () => {
    const { result } = renderHook(() => useThemeController());
    act(() => result.current.setTheme("dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("expendit.theme")).toBe("dark");
    await waitFor(() => expect(result.current.theme).toBe("dark"));
  });

  it("system removes the attribute (OS preference applies)", () => {
    const { result } = renderHook(() => useThemeController());
    act(() => result.current.setTheme("dark"));
    act(() => result.current.setTheme("system"));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("expendit.theme")).toBeNull();
  });

  it("mount applies the stored preference", async () => {
    localStorage.setItem("expendit.theme", "light");
    const { result } = renderHook(() => useThemeController());
    await waitFor(() => expect(result.current.theme).toBe("light"));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("applyTheme is a pure DOM seam", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyTheme("system");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
