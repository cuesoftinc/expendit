/**
 * AuthProvider interface — X-1 Google-only auth behind a provider seam
 * (web standard): TestModeAuthProvider now; FirebaseAuthProvider lands at
 * backend-integration time. Views/controllers never import a concrete
 * provider.
 */

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photo_url: string | null;
}

export interface AuthProvider {
  /**
   * Synchronous snapshot of the current session (null = signed out).
   * Contract (flows/auth.md §2, ratified 2026-07-22): a failed session
   * read reads as **signed out** — implementations return `null` on any
   * failure and MUST NOT throw; the controllers still catch as a second
   * net so a misbehaving provider can never strand a guard at its
   * loading state.
   */
  currentUser(): AuthUser | null;
  /** The single X-1 sign-in path. Resolves with the signed-in user. */
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Bearer token for API calls (null when signed out). */
  getIdToken(): Promise<string | null>;
}
