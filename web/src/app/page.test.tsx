import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/design/ThemeProvider";
import Home from "./page";

// Route-level smoke: `/` renders the Part A home (pages.md). Migrated
// from the legacy Jest suite (__tests__/) when the dual test runner was
// retired — section-level coverage lives in components/home/*.test.tsx.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

describe("app route /", () => {
  it("renders the Part A hero", () => {
    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "See every naira. File every tax.",
      }),
    ).toBeInTheDocument();
  });
});
