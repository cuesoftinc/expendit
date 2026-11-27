/**
 * SessionAuthProvider: Google sign-in through the API's own session. The
 * API sets an HttpOnly session cookie after the handoff exchange, so this
 * provider only starts the redirect and reads the session back from /me.
 */

import { startGoogleSso } from "@/lib/auth/sso";
import { ApiError, api } from "@/models/repositories/client";
import type { AuthProvider, AuthUser } from "./types";

interface MeResponse {
  user_id: string;
  email: string;
}

const toAuthUser = (me: MeResponse): AuthUser => ({
  uid: me.user_id,
  name: me.email.split("@")[0] ?? "",
  email: me.email,
  photo_url: null,
});

export class SessionAuthProvider implements AuthProvider {
  private user: AuthUser | null = null;
  private generation = 0;
  private restored: Promise<void> | null = null;

  ready(): Promise<void> {
    this.restored ??= this.restore();
    return this.restored;
  }

  currentUser(): AuthUser | null {
    return this.user;
  }

  async signInWithGoogle(): Promise<AuthUser> {
    await startGoogleSso();
    // The browser is leaving for Google; this never resolves on this page.
    return new Promise<AuthUser>(() => {});
  }

  clearSession(): void {
    this.generation += 1;
    this.user = null;
    this.restored = Promise.resolve();
  }

  async signOut(): Promise<void> {
    this.clearSession();
    try {
      await api.post<void>("/auth/logout");
    } catch (error) {
      // An already-ended session is still signed out.
      if (!(error instanceof ApiError)) throw error;
    }
  }

  async getBearerToken(): Promise<string | null> {
    return null;
  }

  private async restore(): Promise<void> {
    const generation = this.generation;
    try {
      // A failed session read is signed out (flows/auth.md §2).
      const me = await api.get<MeResponse>("/me");
      if (generation === this.generation) this.user = toAuthUser(me);
    } catch {
      if (generation === this.generation) this.user = null;
    }
  }
}
