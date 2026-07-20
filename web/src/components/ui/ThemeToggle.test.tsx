// ThemeToggle: cycles the ThemeProvider preference light → dark → system
// (theme contract 2026-07-20); persists under `expendit.theme` with
// KEY ABSENT = system; the aria-label announces the active mode.
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
  it("announces the active mode and cycles system → light", async () => {
    setup();
    const toggle = screen.getByRole("button", {
      name: "Theme: system — switch to light",
    });
    await userEvent.click(toggle);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("cycles light → dark → system (key removed, resolved applied)", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Theme: system — switch to light" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Theme: light — switch to dark" }),
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    await userEvent.click(
      screen.getByRole("button", { name: "Theme: dark — switch to system" }),
    );
    // Key absent = system; data-theme carries the resolved OS theme
    // (light — no matchMedia dark in jsdom).
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
