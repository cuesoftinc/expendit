import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SigninView from "./SigninView";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch: vi.fn() }),
}));

describe("/signin view (flows/auth.md §1 — the one auth screen)", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders a single Google CTA and no password fields", () => {
    render(<SigninView />);
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(document.querySelector('input[type="email"]')).toBeNull();
  });

  it("carries the frame construction: card, dotted wordmark, copy deck (Figma 178:19)", () => {
    render(<SigninView />);
    expect(
      screen.getByRole("heading", { name: "Sign in to your workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Statements, ratios and taxes — one account."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Google sign-in only — no passwords to manage."),
    ).toBeInTheDocument();
    // Wordmark with the accent dot, inside the bordered card.
    const dot = screen.getByText(".", { selector: "span.text-accent" });
    expect(dot).toBeInTheDocument();
    expect(dot.closest("div.border-border")).not.toBeNull();
  });

  it("TEST_MODE: Continue with Google signs in and routes to /dashboard", async () => {
    render(<SigninView />);
    await userEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
