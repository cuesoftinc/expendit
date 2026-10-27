import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthCallbackPage from "./page";

const HANDOFF = "h".repeat(43);
const JWT_FRAGMENT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJl";

const mocks = vi.hoisted(() => {
  class FakeSsoExchangeError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code = "") {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return {
    FakeSsoExchangeError,
    routerReplace: vi.fn(),
    resetAuthProvider: vi.fn(),
    selectSsoExchangeChannel: vi.fn(),
    exchangeSsoSelectedChannel: vi.fn(),
    startGoogleSso: vi.fn(),
    clearSsoClientState: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.routerReplace }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/auth", () => ({ resetAuthProvider: mocks.resetAuthProvider }));

vi.mock("@/lib/auth/sso", () => ({
  SsoExchangeError: mocks.FakeSsoExchangeError,
  selectSsoExchangeChannel: mocks.selectSsoExchangeChannel,
  exchangeSsoSelectedChannel: mocks.exchangeSsoSelectedChannel,
  startGoogleSso: mocks.startGoogleSso,
  clearSsoClientState: mocks.clearSsoClientState,
}));

const bodyChannel = (handoff: string) => ({
  channel: "body",
  handoff,
  verifier: "v".repeat(43),
});

beforeEach(() => {
  window.history.replaceState(null, "", "/auth/callback");
  mocks.routerReplace.mockReset();
  mocks.resetAuthProvider.mockReset();
  mocks.selectSsoExchangeChannel
    .mockReset()
    .mockImplementation((handoff: string | null) =>
      handoff ? bodyChannel(handoff) : { channel: "cookie" },
    );
  mocks.exchangeSsoSelectedChannel.mockReset().mockResolvedValue(undefined);
  mocks.startGoogleSso.mockReset().mockResolvedValue(undefined);
  mocks.clearSsoClientState.mockReset().mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuthCallbackPage contract", () => {
  it("cleans the URL before redeeming a verifier-bound handoff", async () => {
    const order: string[] = [];
    const replaceState = window.history.replaceState.bind(window.history);
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
      order.push("history");
      replaceState(...args);
    });
    mocks.exchangeSsoSelectedChannel.mockImplementation(async () => {
      order.push("exchange");
    });
    mocks.routerReplace.mockImplementation(() => {
      order.push("router");
      expect(window.location.href).not.toContain(HANDOFF);
    });

    render(<AuthCallbackPage />);

    await waitFor(() =>
      expect(mocks.routerReplace).toHaveBeenCalledWith("/dashboard"),
    );
    expect(order).toEqual(["history", "exchange", "router"]);
    expect(mocks.selectSsoExchangeChannel).toHaveBeenCalledWith(HANDOFF);
    expect(mocks.exchangeSsoSelectedChannel).toHaveBeenCalledWith(
      bodyChannel(HANDOFF),
    );
    expect(mocks.resetAuthProvider).toHaveBeenCalledOnce();
    expect(window.location.href).toBe(
      `${window.location.origin}/auth/callback`,
    );
  });

  it("accepts the HttpOnly cookie handoff when no query secret is present", async () => {
    render(<AuthCallbackPage />);

    await waitFor(() =>
      expect(mocks.routerReplace).toHaveBeenCalledWith("/dashboard"),
    );
    expect(mocks.selectSsoExchangeChannel).toHaveBeenCalledWith(null);
    expect(mocks.exchangeSsoSelectedChannel).toHaveBeenCalledWith({
      channel: "cookie",
    });
  });

  it("shows a sanitized OAuth error without attempting an exchange", async () => {
    const rawDescription = "provider detail secret";
    window.history.replaceState(
      null,
      "",
      `/auth/callback?error=access_denied&error_description=${encodeURIComponent(rawDescription)}`,
    );

    render(<AuthCallbackPage />);

    expect(await screen.findByText(/sign-in was cancelled/i)).toBeVisible();
    expect(screen.queryByText(rawDescription)).not.toBeInTheDocument();
    expect(mocks.exchangeSsoSelectedChannel).not.toHaveBeenCalled();
    expect(window.location.href).toBe(
      `${window.location.origin}/auth/callback`,
    );
  });

  it("uses a sanitized fallback for unknown OAuth error redirects", async () => {
    const rawMessage = "unknown provider failure";
    window.history.replaceState(
      null,
      "",
      `/auth/callback?error=provider_failure&message=${encodeURIComponent(rawMessage)}`,
    );

    render(<AuthCallbackPage />);

    expect(await screen.findByText(/could not be completed/i)).toBeVisible();
    expect(screen.queryByText(rawMessage)).not.toBeInTheDocument();
    expect(mocks.exchangeSsoSelectedChannel).not.toHaveBeenCalled();
  });

  it("rejects a JWT fragment even alongside a valid handoff", async () => {
    window.history.replaceState(
      null,
      "",
      `/auth/callback?handoff=${HANDOFF}#token=${JWT_FRAGMENT}`,
    );

    render(<AuthCallbackPage />);

    expect(
      await screen.findByText(/invalid or no longer supported/i),
    ).toBeVisible();
    expect(mocks.selectSsoExchangeChannel).not.toHaveBeenCalled();
    expect(mocks.exchangeSsoSelectedChannel).not.toHaveBeenCalled();
    expect(window.location.href).toBe(
      `${window.location.origin}/auth/callback`,
    );
  });

  it.each([
    "/auth/callback?handoff=short",
    `/auth/callback?handoff=${HANDOFF}&handoff=${"x".repeat(43)}`,
    `/auth/callback?handoff=${HANDOFF}&next=https%3A%2F%2Fevil.example`,
    `/auth/callback?handoff=${HANDOFF}&error=access_denied`,
    "/auth/callback?error=access_denied&error=server_error",
    `/auth/callback?error=access_denied#token=${JWT_FRAGMENT}`,
  ])("fails closed for a callback outside the contract: %s", async (url) => {
    window.history.replaceState(null, "", url);

    render(<AuthCallbackPage />);

    expect(
      await screen.findByText(/invalid or no longer supported/i),
    ).toBeVisible();
    expect(mocks.exchangeSsoSelectedChannel).not.toHaveBeenCalled();
    expect(mocks.routerReplace).not.toHaveBeenCalled();
    expect(mocks.startGoogleSso).not.toHaveBeenCalled();
  });

  it("does not exchange when SSO browser state cannot be confirmed cleared", async () => {
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    mocks.clearSsoClientState.mockReturnValue(false);

    render(<AuthCallbackPage />);

    expect(
      await screen.findByText(/could not secure the sign-in callback/i),
    ).toBeVisible();
    expect(mocks.exchangeSsoSelectedChannel).not.toHaveBeenCalled();
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it("fails closed when callback history cleanup is unavailable", async () => {
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    render(<AuthCallbackPage />);

    expect(
      await screen.findByText(/could not secure the sign-in callback/i),
    ).toBeVisible();
    expect(mocks.selectSsoExchangeChannel).not.toHaveBeenCalled();
    expect(mocks.exchangeSsoSelectedChannel).not.toHaveBeenCalled();
  });
});

describe("AuthCallbackPage recovery", () => {
  it("retries a transient exchange with the same channel selection", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    mocks.exchangeSsoSelectedChannel
      .mockRejectedValueOnce(new mocks.FakeSsoExchangeError("outage", 503))
      .mockResolvedValueOnce(undefined);

    render(<AuthCallbackPage />);

    expect(await screen.findByText(/temporarily unavailable/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /retry completion/i }));

    await waitFor(() =>
      expect(mocks.routerReplace).toHaveBeenCalledWith("/dashboard"),
    );
    expect(mocks.selectSsoExchangeChannel).toHaveBeenCalledOnce();
    expect(mocks.exchangeSsoSelectedChannel).toHaveBeenNthCalledWith(
      2,
      bodyChannel(HANDOFF),
    );
  });

  it("sanitizes backend and thrown callback errors", async () => {
    const rawDetail = "sensitive upstream detail";
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    mocks.exchangeSsoSelectedChannel.mockRejectedValue(
      new mocks.FakeSsoExchangeError(rawDetail, 503),
    );

    const { unmount } = render(<AuthCallbackPage />);

    expect(await screen.findByText(/temporarily unavailable/i)).toBeVisible();
    expect(screen.queryByText(rawDetail)).not.toBeInTheDocument();

    unmount();
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    mocks.exchangeSsoSelectedChannel.mockRejectedValue(new Error(rawDetail));
    render(<AuthCallbackPage />);

    expect(await screen.findByText(/could not be completed/i)).toBeVisible();
    expect(screen.queryByText(rawDetail)).not.toBeInTheDocument();
  });

  it("turns a consumed handoff into a clean full-flow restart", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    mocks.exchangeSsoSelectedChannel.mockRejectedValue(
      new mocks.FakeSsoExchangeError("expired", 401, "handoff_invalid"),
    );

    render(<AuthCallbackPage />);

    expect(
      await screen.findByText(/expired or was already used/i),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /start sign-in again/i }),
    );
    expect(mocks.startGoogleSso).toHaveBeenCalledOnce();
  });

  it("restores recovery controls when a restart is refused", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    mocks.exchangeSsoSelectedChannel.mockRejectedValue(
      new mocks.FakeSsoExchangeError("expired", 401, "handoff_invalid"),
    );
    mocks.startGoogleSso.mockRejectedValue(new Error("Navigation refused"));

    render(<AuthCallbackPage />);
    await user.click(
      await screen.findByRole("button", { name: /start sign-in again/i }),
    );

    expect(await screen.findByText(/could not restart/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /back to login/i })).toBeVisible();
  });

  it("clears retained SSO state when recovery is abandoned", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", `/auth/callback?handoff=${HANDOFF}`);
    mocks.exchangeSsoSelectedChannel.mockRejectedValue(
      new mocks.FakeSsoExchangeError("outage", 503),
    );

    render(<AuthCallbackPage />);
    await screen.findByText(/temporarily unavailable/i);
    const before = mocks.clearSsoClientState.mock.calls.length;
    await user.click(screen.getByRole("link", { name: /back to login/i }));

    expect(mocks.clearSsoClientState).toHaveBeenCalledTimes(before + 1);
  });
});
