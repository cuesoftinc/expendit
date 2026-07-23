/**
 * Typed access to environment switches (web standard — TEST_MODE).
 *
 * NEXT_PUBLIC_TEST_MODE=1 puts the app in TEST_MODE: GoogleAuthButton
 * navigates straight to the dashboard (no Firebase) and the API client
 * targets the in-app mock server (/api/mock/v1).
 */
export const env = {
  /** Base path for the API the repositories talk to. */
  apiBase:
    process.env.NEXT_PUBLIC_TEST_MODE === "1" ? "/api/mock/v1" : "/api/v1",
  /**
   * TEST_MODE (web-standard): NEXT_PUBLIC_TEST_MODE=1 →
   * - GoogleAuthButton navigates straight to /dashboard (no Firebase), and
   * - the API client targets the in-app mock server (/api/mock/v1).
   */
  testMode: process.env.NEXT_PUBLIC_TEST_MODE === "1",
} as const;
