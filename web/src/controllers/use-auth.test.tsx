import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { AuthUser } from "@/auth/types";
import { useRedirectAuthed, useRequireAuth } from "./use-auth";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
}));

// A provider that violates its own contract (auth/types.ts: return null,
// never throw) — the controllers' second net must map it to signed out
// (flows/auth.md §2), never a stranded loading state.
vi.mock("@/auth", () => ({
  getAuthProvider: () => {
    throw new Error("restore exploded");
  },
  resetAuthProvider: vi.fn(),
}));

describe("session-read failure net (flows/auth.md §2)", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("useRequireAuth: a throwing provider reads as signed out → /signin", async () => {
    let state: { user: AuthUser | null; checked: boolean } = {
      user: null,
      checked: false,
    };
    const Probe = () => {
      state = useRequireAuth();
      return null;
    };
    render(<Probe />);
    await waitFor(() => expect(state.checked).toBe(true));
    expect(state.user).toBeNull();
    expect(replace).toHaveBeenCalledWith("/signin");
  });

  it("useRedirectAuthed: a throwing provider reads as signed out → the CTA renders", async () => {
    let state: { user: AuthUser | null; checked: boolean } = {
      user: null,
      checked: false,
    };
    const Probe = () => {
      state = useRedirectAuthed();
      return null;
    };
    render(<Probe />);
    await waitFor(() => expect(state.checked).toBe(true));
    expect(state.user).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
