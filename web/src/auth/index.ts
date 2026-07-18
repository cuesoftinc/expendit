/**
 * Auth provider factory. TEST_MODE resolves the TestModeAuthProvider;
 * the FirebaseAuthProvider (Google-only, sandbox-e306a) is added at
 * backend-integration time — X-1 either way.
 */

import { isTestMode } from "@/config/env";
import type { AuthProvider } from "./types";
import { TestModeAuthProvider } from "./test-mode-provider";

let provider: AuthProvider | null = null;

export const getAuthProvider = (): AuthProvider => {
  if (!provider) {
    if (!isTestMode()) {
      // Firebase provider lands with backend integration; until then the
      // only wired mode is TEST_MODE (mock server + instant session).
      throw new Error(
        "FirebaseAuthProvider not yet wired — run with NEXT_PUBLIC_TEST_MODE=1",
      );
    }
    provider = new TestModeAuthProvider();
  }
  return provider;
};

/** Test seam. */
export const resetAuthProvider = (): void => {
  provider = null;
};

export type { AuthProvider, AuthUser } from "./types";
export { TestModeAuthProvider, TEST_USER } from "./test-mode-provider";
