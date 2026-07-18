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
  /** Synchronous snapshot of the current session (null = signed out). */
  currentUser(): AuthUser | null;
  /** The single X-1 sign-in path. Resolves with the signed-in user. */
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Bearer token for API calls (null when signed out). */
  getIdToken(): Promise<string | null>;
}
