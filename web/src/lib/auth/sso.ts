/**
 * Browser half of the Google sign-in: a per-tab PKCE verifier, the redirect
 * into the API flow and the one-time handoff exchange that sets the
 * session cookie.
 */

import { ApiError, api } from "@/models/repositories/client";

const SSO_BASE = "/api/v1/auth/sso";
const SSO_VERIFIER_STORAGE_KEY = "expendit_sso_verifier";
const SSO_STORAGE_PREFIX = "expendit_sso_";
const SSO_VERIFIER_TTL_MS = 10 * 60 * 1_000;
const SSO_EXCHANGE_RETRY_DELAYS_MS = [0, 1_000, 3_000, 7_000];
const SSO_EXCHANGE_TIMEOUT_MS = 15_000;

interface StoredSsoVerifier {
  version: 1;
  verifier: string;
  owner: string;
  createdAt: number;
  expiresAt: number;
}

/** status 0 means the request never got an answer (network failure or timeout). */
export class SsoExchangeError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "") {
    super(message);
    this.name = "SsoExchangeError";
    this.status = status;
    this.code = code;
  }
}

let ssoStartInFlight = false;

// A back/forward-cache restore keeps the guard set, which would brick the button.
if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) ssoStartInFlight = false;
  });
}

const base64UrlEncode = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const clearSsoStorage = (getStorage: () => Storage): boolean => {
  try {
    const storage = getStorage();
    const keys = new Set<string>([SSO_VERIFIER_STORAGE_KEY]);
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(SSO_STORAGE_PREFIX)) keys.add(key);
    }
    for (const key of keys) storage.removeItem(key);
    return [...keys].every((key) => storage.getItem(key) === null);
  } catch {
    return false;
  }
};

/** Clears every client-held SSO record and confirms none remain readable. */
export const clearSsoClientState = (): boolean => {
  if (typeof window === "undefined") return false;
  ssoStartInFlight = false;
  const sessionCleared = clearSsoStorage(() => window.sessionStorage);
  const localCleared = clearSsoStorage(() => window.localStorage);
  return sessionCleared && localCleared;
};

const commitVerifierChallenge = async (): Promise<string> => {
  const createdAt = Date.now();
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const record: StoredSsoVerifier = {
    version: 1,
    verifier,
    owner: window.location.origin,
    createdAt,
    expiresAt: createdAt + SSO_VERIFIER_TTL_MS,
  };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const serialized = JSON.stringify(record);
  window.sessionStorage.setItem(SSO_VERIFIER_STORAGE_KEY, serialized);
  if (window.sessionStorage.getItem(SSO_VERIFIER_STORAGE_KEY) !== serialized) {
    throw new Error("SSO verifier could not be retained.");
  }
  return base64UrlEncode(new Uint8Array(digest));
};

/** Commits a verifier for this tab, then hands the browser to the API (full-page navigation, never fetch). */
export const startGoogleSso = async (): Promise<void> => {
  // A second activation must not overwrite the verifier the pending redirect carries.
  if (ssoStartInFlight) return;
  if (!clearSsoClientState()) {
    throw new Error("SSO browser state is unavailable.");
  }
  ssoStartInFlight = true;
  try {
    const challenge = await commitVerifierChallenge();
    const params = new URLSearchParams({ cv: challenge });
    window.location.assign(`${SSO_BASE}/google?${params.toString()}`);
  } catch (error) {
    clearSsoClientState();
    throw error;
  }
};

export type SsoExchangeChannel =
  | { channel: "body"; handoff: string; verifier: string }
  | { channel: "cookie" };

const isFreshOwnedRecord = (record: Partial<StoredSsoVerifier>): boolean => {
  const now = Date.now();
  return (
    record.version === 1 &&
    record.owner === window.location.origin &&
    typeof record.createdAt === "number" &&
    typeof record.expiresAt === "number" &&
    record.createdAt <= now + 60_000 &&
    record.expiresAt > now &&
    record.expiresAt - record.createdAt === SSO_VERIFIER_TTL_MS
  );
};

const readStoredVerifier = (): string | null => {
  try {
    const value = window.sessionStorage.getItem(SSO_VERIFIER_STORAGE_KEY);
    if (!value) return null;
    const record = JSON.parse(value) as Partial<StoredSsoVerifier>;
    if (
      isFreshOwnedRecord(record) &&
      typeof record.verifier === "string" &&
      /^[A-Za-z0-9_-]{43}$/.test(record.verifier)
    ) {
      return record.verifier;
    }
  } catch {
    return null;
  }
  return null;
};

/** Pins the exchange channel once per attempt: the verifier-bound body when both secrets exist, else the HttpOnly handoff cookie. */
export const selectSsoExchangeChannel = (
  handoff: string | null,
): SsoExchangeChannel => {
  const verifier = handoff ? readStoredVerifier() : null;
  if (handoff && verifier) return { channel: "body", handoff, verifier };
  return { channel: "cookie" };
};

interface ExchangeBody {
  handoff: string;
  verifier: string;
}

const requestExchange = async (
  body: ExchangeBody | undefined,
): Promise<void> => {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    SSO_EXCHANGE_TIMEOUT_MS,
  );
  try {
    await api.post<unknown>("/auth/sso/exchange", body, {
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new SsoExchangeError(
        "Sign-in could not be completed.",
        error.status,
        error.code === "unknown_error" ? "" : error.code,
      );
    }
    throw new SsoExchangeError("Sign-in request did not complete.", 0);
  } finally {
    window.clearTimeout(timer);
  }
};

// 401 means the handoff expired or was consumed, so it is never retried.
const isRetryableExchangeError = (error: unknown): boolean =>
  error instanceof SsoExchangeError &&
  (error.status === 0 || error.status >= 500);

const exchangeWithRetry = async (
  body: ExchangeBody | undefined,
): Promise<void> => {
  let lastError: unknown;
  for (const delayMs of SSO_EXCHANGE_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
    try {
      await requestExchange(body);
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableExchangeError(error)) throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Google sign-in could not complete. Please try again.");
};

/** Once the body channel is selected every retry stays on it; a rejected body never downgrades to the cookie secret. */
export const exchangeSsoSelectedChannel = (
  selected: SsoExchangeChannel,
): Promise<void> =>
  exchangeWithRetry(
    selected.channel === "body"
      ? { handoff: selected.handoff, verifier: selected.verifier }
      : undefined,
  );
