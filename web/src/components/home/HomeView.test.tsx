import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/design/ThemeProvider";
import HomeView from "./HomeView";

// The nav theme toggle reads the design-layer ThemeProvider (parity
// canon, 2026-07-19) — render under it.
const renderHome = () =>
  render(
    <ThemeProvider>
      <HomeView />
    </ThemeProvider>,
  );

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch: vi.fn() }),
}));

describe("public home `/` (pages.md Part A, A1–A11)", () => {
  beforeEach(() => {
    push.mockClear();
    window.__expenditEvents = [];
  });

  it("renders every Part A section", () => {
    renderHome();
    // A2 hero
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "See every naira. File every tax.",
      }),
    ).toBeInTheDocument();
    // A4 pillars
    expect(screen.getByText("One ledger. Three superpowers.")).toBeVisible();
    // A4a deep-dives
    expect(screen.getByText("Every statement, one pipeline")).toBeVisible();
    // A5 demo + A5a how-it-works
    expect(screen.getByText("Explore the live demo")).toBeVisible();
    expect(screen.getByText("How it works")).toBeVisible();
    // A6–A7
    expect(screen.getByText("AI that shows its work")).toBeVisible();
    expect(
      screen.getByText("Security & privacy, in plain language"),
    ).toBeVisible();
    // A8/A8a
    expect(
      screen.getByText("For developers — come build the hard parts"),
    ).toBeVisible();
    expect(
      screen.getByText("Self-host: your books never leave your building"),
    ).toBeVisible();
    // A9–A10b
    expect(
      screen.getByRole("heading", { level: 2, name: "Community" }),
    ).toBeVisible();
    expect(screen.getByText("Cloud or self-host — same product")).toBeVisible();
    expect(screen.getByText("Questions, answered")).toBeVisible();
    expect(screen.getByText("Your numbers are ready to talk.")).toBeVisible();
    // A11 footer
    expect(screen.getByText("View Security Policy")).toBeInTheDocument();
  });

  it("emits page_view on mount", () => {
    renderHome();
    expect(
      window.__expenditEvents?.some((record) => record.event === "page_view"),
    ).toBe(true);
  });

  it("hero Try Cloud emits try_cloud_click and routes to /signin", async () => {
    renderHome();
    // The nav Try Cloud retired with the parity canon (Sign in is the nav
    // CTA) — the first Try Cloud button is now the A2 hero CTA.
    const heroTryCloud = screen.getAllByRole("button", {
      name: "Try Cloud",
    })[0];
    await userEvent.click(heroTryCloud);
    expect(push).toHaveBeenCalledWith("/signin");
    expect(window.__expenditEvents?.at(-1)).toMatchObject({
      event: "try_cloud_click",
      props: { source: "hero" },
    });
  });

  it("Self Host CTA emits self_host_click (scrolls to A8a)", async () => {
    renderHome();
    const [heroSelfHost] = screen.getAllByRole("button", {
      name: "Self Host",
    });
    await userEvent.click(heroSelfHost);
    expect(
      window.__expenditEvents?.some(
        (record) => record.event === "self_host_click",
      ),
    ).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("A10b final CTA re-emits the A2 events (pages.md A10b)", async () => {
    renderHome();
    const tryClouds = screen.getAllByRole("button", { name: "Try Cloud" });
    await userEvent.click(tryClouds[tryClouds.length - 1]);
    expect(window.__expenditEvents?.at(-1)).toMatchObject({
      event: "try_cloud_click",
      props: { source: "final_cta" },
    });
    expect(push).toHaveBeenCalledWith("/signin");
  });

  it("marketing accuracy: pricing is only the GA/self-host line", () => {
    renderHome();
    expect(screen.getByText("Announced at GA")).toBeInTheDocument();
    expect(screen.getByText("Free forever")).toBeInTheDocument();
    // Star badge is neutral until a runtime count arrives (TEST_MODE: never).
    expect(screen.getByTestId("github-star-badge")).toHaveTextContent(
      "Star on GitHub",
    );
    // No currency-priced plan anywhere on the page.
    expect(screen.queryByText(/\$\d|₦\d+\s*\/\s*mo/)).toBeNull();
  });
});
