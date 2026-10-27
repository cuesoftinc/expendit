/**
 * Auth provider factory. TEST_MODE resolves the TestModeAuthProvider;
 * otherwise the SessionAuthProvider (Google-only, API-issued session
 * cookie), X-1 either way.
 */

import { env } from "@/config/env";
import type { AuthProvider } from "./types";
import { TestModeAuthProvider } from "./test-mode-provider";
import { SessionAuthProvider } from "./session-provider";

let provider: AuthProvider | null = null;

export const getAuthProvider = (): AuthProvider => {
  if (!provider) {
    provider = env.testMode
      ? new TestModeAuthProvider()
      : new SessionAuthProvider();
  }
  return provider;
};

/** Test seam — vitest.setup.ts resets the singleton between tests. */
export const resetAuthProvider = (): void => {
  provider = null;
};

export type { AuthProvider, AuthUser } from "./types";
export { TestModeAuthProvider, TEST_USER } from "./test-mode-provider";
