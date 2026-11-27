import { getAuthProvider } from "@/auth";

const DESTINATION_KEY = "expendit.auth-next";
let redirecting = false;

function safeDestination(value: string | null): string {
  if (!value || typeof window === "undefined") return "/dashboard";
  let url: URL;
  try {
    url = new URL(value, window.location.origin);
  } catch {
    return "/dashboard";
  }
  if (
    url.origin !== window.location.origin ||
    !/^\/(dashboard|onboarding)(\/|$)/.test(url.pathname)
  ) {
    return "/dashboard";
  }
  return url.pathname + url.search + url.hash;
}

export function rememberSignInDestination(): void {
  const next = new URLSearchParams(window.location.search).get("next");
  try {
    window.sessionStorage.setItem(DESTINATION_KEY, safeDestination(next));
  } catch {
    // Sign-in can continue with the default destination if storage is unavailable.
  }
}

export function signInDestination(): string {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(DESTINATION_KEY);
    window.sessionStorage.removeItem(DESTINATION_KEY);
  } catch {
    // Fall back to the query parameter or the dashboard.
  }
  return safeDestination(next ?? stored);
}

export function sessionSignInUrl(): string {
  if (
    typeof window === "undefined" ||
    !/^\/(dashboard|onboarding)(\/|$)/.test(window.location.pathname)
  ) {
    return "/signin";
  }
  const next =
    window.location.pathname + window.location.search + window.location.hash;
  return `/signin?${new URLSearchParams({ next })}`;
}

export function redirectExpiredSession(): void {
  if (typeof window === "undefined" || redirecting) return;
  getAuthProvider().clearSession();
  const destination = sessionSignInUrl();
  if (destination === "/signin") return;
  redirecting = true;
  window.location.replace(destination);
}
