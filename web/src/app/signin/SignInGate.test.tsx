import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SignInGate from "./SignInGate";
import { TEST_USER } from "@/auth";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
}));

describe("SignInGate (flows/auth.md §2 — the /signin reverse guard)", () => {
  beforeEach(() => {
    replace.mockClear();
    window.sessionStorage.clear();
  });

  it("holds an aria-busy gate on first paint while the session read is in flight", () => {
    render(
      <SignInGate>
        <p>cta</p>
      </SignInGate>,
    );
    // Synchronous first paint — the read microtask hasn't resolved yet:
    // never the CTA.
    expect(screen.getByTestId("signin-gate")).toBeInTheDocument();
    expect(screen.queryByText("cta")).not.toBeInTheDocument();
  });

  it("renders the screen for a signed-out visitor", async () => {
    render(
      <SignInGate>
        <p>cta</p>
      </SignInGate>,
    );
    expect(await screen.findByText("cta")).toBeInTheDocument();
    expect(screen.queryByTestId("signin-gate")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("replaces a signed-in visitor to /dashboard without ever painting the CTA", async () => {
    window.sessionStorage.setItem(
      "expendit.test-session",
      JSON.stringify(TEST_USER),
    );
    render(
      <SignInGate>
        <p>cta</p>
      </SignInGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("cta")).not.toBeInTheDocument();
    expect(screen.getByTestId("signin-gate")).toBeInTheDocument();
  });
});
