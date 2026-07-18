/**
 * Environment switches (web standard — TEST_MODE).
 *
 * NEXT_PUBLIC_TEST_MODE=1 puts the app in TEST_MODE: GoogleAuthButton
 * navigates straight to the dashboard (no Firebase) and the API client
 * targets the in-app mock server (/api/mock).
 */
export const isTestMode = (): boolean =>
  process.env.NEXT_PUBLIC_TEST_MODE === "1";

/** Base path for the API the repositories talk to. */
export const apiBase = (): string => (isTestMode() ? "/api/mock" : "/api/v1");
