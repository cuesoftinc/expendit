// ThemeToggle: cycles the ThemeProvider preference light → dark → system
// (theme contract 2026-07-20); persists under `expendit.theme` with
// KEY ABSENT = dark, expendit's design default; "system" is stored
// explicitly. The aria-label announces the active mode.
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
  it("announces the active mode (key absent = dark, the design default) and cycles to system", async () => {
    setup();
    const toggle = screen.getByRole("button", {
      name: "Theme: dark — switch to system",
    });
    await userEvent.click(toggle);
    // "system" is stored explicitly; data-theme carries the RESOLVED theme
    // (light — no matchMedia dark in jsdom).
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  });

  it("cycles system → light → dark, persisting each explicit choice", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Theme: dark — switch to system" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Theme: system — switch to light" }),
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    await userEvent.click(
      screen.getByRole("button", { name: "Theme: light — switch to dark" }),
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
