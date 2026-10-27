/**
 * Typed access to environment switches (web standard: env access goes
 * through this module only).
 *
 * NEXT_PUBLIC_TEST_MODE=1 puts the app in TEST_MODE: GoogleAuthButton
 * navigates straight to the dashboard (no Firebase) and the API client
 * targets the in-app mock server (/api/mock/v1).
 *
 * Otherwise the app runs against the real backend (system-design.md §7):
 * Firebase Google sign-in (X-1) and /api/v1, which the server-side proxy
 * (src/app/api/v1) forwards to api/common, and /api/v1/uploads to
 * api/statements.
 *
 * NEXT_PUBLIC_* values are inlined at `next build`; the API origins are
 * read at request time on the server, so one image runs anywhere.
 */

const testMode = process.env.NEXT_PUBLIC_TEST_MODE === "1";

export const env = {
  /** Base path for the API the repositories talk to. */
  apiBase: testMode ? "/api/mock/v1" : "/api/v1",
  /**
   * TEST_MODE (web-standard): NEXT_PUBLIC_TEST_MODE=1 →
   * - GoogleAuthButton navigates straight to /dashboard (no Firebase), and
   * - the API client targets the in-app mock server (/api/mock/v1).
   */
  testMode,
  /** Firebase web config (public by design; X-1). */
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    /** host:port of the Auth emulator for local runs; empty in cloud. */
    authEmulatorHost: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "",
  },
} as const;

/**
 * Server-only: where the /api/v1 proxy forwards. Read per request so the
 * same build serves compose (http://common:8080) and cloud.
 */
export const serverEnv = () => ({
  apiOrigin: process.env.API_ORIGIN ?? "http://localhost:8080",
  uploadsOrigin: process.env.UPLOADS_ORIGIN ?? "http://localhost:8081",
});
