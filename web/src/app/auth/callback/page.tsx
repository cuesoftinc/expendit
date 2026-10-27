"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetAuthProvider } from "@/auth";
import {
  clearSsoClientState,
  exchangeSsoSelectedChannel,
  selectSsoExchangeChannel,
  SsoExchangeError,
  startGoogleSso,
  type SsoExchangeChannel,
} from "@/lib/auth/sso";
import {
  getOAuthRedirectErrorMessage,
  getSsoCompletionErrorMessage,
} from "@/lib/auth/oauth-errors";

const CALLBACK_CLEANUP_ERROR =
  "This browser could not secure the sign-in callback. Close this tab and try again.";
const CALLBACK_CONTRACT_ERROR =
  "This sign-in response is invalid or no longer supported. Please start sign-in again.";
const RESTART_FAILED_ERROR =
  "Google sign-in could not restart. Please try again.";
const HANDOFF_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const OAUTH_ERROR_KEYS = new Set(["error", "error_description", "message"]);

type Recovery =
  { kind: "exchange"; selected: SsoExchangeChannel } | { kind: "restart" };

type CallbackContract =
  | { kind: "exchange"; handoff: string | null }
  | { kind: "oauth-error"; message: string }
  | { kind: "invalid" };

const readCallbackContract = (
  search: string,
  hash: string,
): CallbackContract => {
  if (hash) return { kind: "invalid" };

  const params = new URLSearchParams(search);
  const keys = [...params.keys()];
  if (keys.length === 0) return { kind: "exchange", handoff: null };

  if (params.has("handoff")) {
    const handoffs = params.getAll("handoff");
    if (keys.some((key) => key !== "handoff")) return { kind: "invalid" };
    if (handoffs.length !== 1 || !HANDOFF_PATTERN.test(handoffs[0])) {
      return { kind: "invalid" };
    }
    return { kind: "exchange", handoff: handoffs[0] };
  }

  if (
    keys.every((key) => OAUTH_ERROR_KEYS.has(key)) &&
    [...new Set(keys)].every((key) => params.getAll(key).length === 1)
  ) {
    const message = getOAuthRedirectErrorMessage(params);
    if (message) return { kind: "oauth-error", message };
  }

  return { kind: "invalid" };
};

const AuthCallbackPage = () => {
  const router = useRouter();
  const startedRef = useRef(false);
  const recoveryRef = useRef<Recovery>({ kind: "restart" });
  const [status, setStatus] = useState("Completing sign-in…");
  const [error, setError] = useState<string | null>(null);
  const [retryLabel, setRetryLabel] = useState("Start sign-in again");

  const showRecoveryError = useCallback(
    (message: string, label: string, recovery: Recovery) => {
      if (recovery.kind === "restart") clearSsoClientState();
      recoveryRef.current = recovery;
      setRetryLabel(label);
      setError(message);
    },
    [],
  );

  // The channel is pinned in the recovery record so a UI retry can never downgrade a body-bound exchange to the cookie secret.
  const exchangeAndEnter = useCallback(
    async (selected: SsoExchangeChannel) => {
      try {
        await exchangeSsoSelectedChannel(selected);
      } catch (reason) {
        const retryable =
          reason instanceof SsoExchangeError &&
          (reason.status === 0 || reason.status >= 500);
        showRecoveryError(
          getSsoCompletionErrorMessage(reason),
          retryable ? "Retry completion" : "Start sign-in again",
          retryable ? { kind: "exchange", selected } : { kind: "restart" },
        );
        return;
      }
      resetAuthProvider();
      router.replace("/dashboard");
    },
    [router, showRecoveryError],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    queueMicrotask(() => {
      const { hash, search, pathname } = window.location;

      try {
        window.history.replaceState(window.history.state, "", pathname);
      } catch {
        showRecoveryError(CALLBACK_CLEANUP_ERROR, "Start sign-in again", {
          kind: "restart",
        });
        return;
      }

      const contract = readCallbackContract(search, hash);
      if (contract.kind === "invalid") {
        showRecoveryError(CALLBACK_CONTRACT_ERROR, "Start sign-in again", {
          kind: "restart",
        });
        return;
      }
      if (contract.kind === "oauth-error") {
        showRecoveryError(contract.message, "Start sign-in again", {
          kind: "restart",
        });
        return;
      }

      const selected = selectSsoExchangeChannel(contract.handoff);
      if (!clearSsoClientState()) {
        showRecoveryError(CALLBACK_CLEANUP_ERROR, "Start sign-in again", {
          kind: "restart",
        });
        return;
      }
      void exchangeAndEnter(selected);
    });
  }, [exchangeAndEnter, showRecoveryError]);

  const retrySignIn = () => {
    const recovery = recoveryRef.current;
    setError(null);
    if (recovery.kind === "exchange") {
      setStatus("Completing sign-in…");
      void exchangeAndEnter(recovery.selected);
      return;
    }
    setStatus("Restarting sign-in…");
    startGoogleSso().catch(() => {
      // A refused restart must bring the recovery UI back instead of a stuck status.
      showRecoveryError(RESTART_FAILED_ERROR, "Start sign-in again", {
        kind: "restart",
      });
    });
  };

  if (error) {
    return (
      <main
        id="main"
        className="flex min-h-screen items-center justify-center bg-bg px-6 text-text"
      >
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Sign-in was interrupted
          </h1>
          <p role="alert" className="mt-3 text-sm text-text-2">
            {error}
          </p>
          <button
            type="button"
            onClick={retrySignIn}
            className="mt-8 w-full rounded border border-border bg-bg px-6 py-3 text-sm font-medium text-text hover:bg-bg-elev"
          >
            {retryLabel}
          </button>
          <Link
            href="/signin"
            onClick={clearSsoClientState}
            className="mt-4 inline-block text-sm text-text-2 underline underline-offset-4 hover:text-text"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-bg px-6 text-text"
    >
      <p role="status" className="text-sm text-text-2">
        {status}
      </p>
    </main>
  );
};

export default AuthCallbackPage;
