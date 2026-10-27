import { SsoExchangeError } from "./sso";

const TRY_AGAIN = "Please try again.";
const UNAVAILABLE = `Google sign-in is temporarily unavailable. ${TRY_AGAIN}`;

const OAUTH_ERROR_MESSAGES = new Map<string, string>([
  [
    "access_denied",
    "Google sign-in was cancelled. You can try again when you are ready.",
  ],
  ["missing_state", `Your sign-in session expired. ${TRY_AGAIN}`],
  ["invalid_state", `Your sign-in session could not be verified. ${TRY_AGAIN}`],
  ["expired_state", `Your sign-in session expired. ${TRY_AGAIN}`],
  ["missing_code", `Google did not complete sign-in. ${TRY_AGAIN}`],
  ["oauth_failed", `Google did not complete sign-in. ${TRY_AGAIN}`],
  ["sso_failed", UNAVAILABLE],
  ["server_error", UNAVAILABLE],
  ["temporarily_unavailable", UNAVAILABLE],
]);

const DEFAULT_OAUTH_ERROR = `Google sign-in could not be completed. ${TRY_AGAIN}`;

/** Returns the user-safe message for an error redirect, or null when the query carries no error. */
export const getOAuthRedirectErrorMessage = (
  searchParams: URLSearchParams,
): string | null => {
  const code = searchParams.get("error")?.trim().toLowerCase();
  const hasLegacyError =
    Boolean(searchParams.get("error_description")?.trim()) ||
    Boolean(searchParams.get("message")?.trim());
  if (!code && !hasLegacyError) return null;
  return (code && OAUTH_ERROR_MESSAGES.get(code)) || DEFAULT_OAUTH_ERROR;
};

export const getSsoCompletionErrorMessage = (error: unknown): string => {
  if (error instanceof SsoExchangeError) {
    if (error.code === "handoff_invalid") {
      return `Your sign-in session expired or was already used. ${TRY_AGAIN}`;
    }
    if (error.status === 0) {
      return "We could not reach Expendit. Check your connection and try again.";
    }
    if (error.status >= 500) return UNAVAILABLE;
  }
  return DEFAULT_OAUTH_ERROR;
};
