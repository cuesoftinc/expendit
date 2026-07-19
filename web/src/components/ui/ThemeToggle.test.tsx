// ThemeToggle: flips the ThemeProvider preference light↔dark and persists
// under `expendit.theme` (theme parity canon, 2026-07-19).
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { THEME_STORAGE_KEY, ThemeProvider } from "@/design/ThemeProvider";
import ThemeToggle from "./ThemeToggle";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

const setup = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

describe("ThemeToggle", () => {
  it("defaults to offering dark, applies + persists it", async () => {
    setup();
    const toggle = screen.getByRole("button", {
      name: "Switch to dark theme",
    });
    await userEvent.click(toggle);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("flips back to light from dark", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
