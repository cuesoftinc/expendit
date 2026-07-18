/**
 * TestModeAuthProvider — NEXT_PUBLIC_TEST_MODE=1: no Firebase, sign-in
 * resolves instantly with the seeded test user and the app goes straight
 * to /dashboard (web standard — TEST_MODE).
 *
 * It also sets the legacy `ExpenditLoggedIn` flag so the pre-redesign
 * protected routes (live until W3) accept the session.
 */

import type { AuthProvider, AuthUser } from "./types";

const SESSION_KEY = "expendit.test-session";
/** Legacy RouteProtection flag (src/components/helpers/RouteProtection). */
const LEGACY_LOGGED_IN_KEY = "ExpenditLoggedIn";

export const TEST_USER: AuthUser = {
  uid: "user-ibukun",
  name: "Ibukun Dairo",
  email: "ibukun.o.dairo@gmail.com",
  photo_url: null,
};

export class TestModeAuthProvider implements AuthProvider {
  currentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  async signInWithGoogle(): Promise<AuthUser> {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(TEST_USER));
      window.localStorage.setItem(LEGACY_LOGGED_IN_KEY, JSON.stringify(true));
    }
    return TEST_USER;
  }

  async signOut(): Promise<void> {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(LEGACY_LOGGED_IN_KEY);
    }
  }

  async getIdToken(): Promise<string | null> {
    return this.currentUser() ? "test-mode-token" : null;
  }
}
