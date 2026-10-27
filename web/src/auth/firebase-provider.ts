/**
 * FirebaseAuthProvider: X-1 Google-only sign-in against Firebase Auth.
 * api/common verifies the ID token on every request (system-design.md §8),
 * so this provider's only job is the browser session and the bearer token.
 *
 * Local runs point at the Auth emulator (NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST),
 * whose Google popup lets you pick or invent an account.
 */

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { env } from "@/config/env";
import type { AuthProvider, AuthUser } from "./types";

const toAuthUser = (user: User): AuthUser => ({
  uid: user.uid,
  name: user.displayName ?? user.email?.split("@")[0] ?? "",
  email: user.email ?? "",
  photo_url: user.photoURL,
});

export class FirebaseAuthProvider implements AuthProvider {
  private readonly auth: Auth;
  private readonly restored: Promise<void>;

  constructor() {
    const { firebase } = env;
    // A local emulator run needs no real project or key.
    const app: FirebaseApp =
      getApps()[0] ??
      initializeApp({
        apiKey: firebase.apiKey || "local-emulator",
        // The emulator serves the popup itself but the SDK still wants a domain.
        authDomain:
          firebase.authDomain ||
          (firebase.authEmulatorHost ? "localhost" : undefined),
        projectId: firebase.projectId || "demo-expendit",
      });
    this.auth = getAuth(app);
    if (firebase.authEmulatorHost) {
      connectAuthEmulator(this.auth, `http://${firebase.authEmulatorHost}`, {
        disableWarnings: true,
      });
    }
    // Firebase restores a persisted session asynchronously; the first
    // auth-state event marks the snapshot as trustworthy.
    this.restored = new Promise((resolve) => {
      const stop = onAuthStateChanged(this.auth, () => {
        stop();
        resolve();
      });
    });
  }

  ready(): Promise<void> {
    return this.restored;
  }

  currentUser(): AuthUser | null {
    try {
      const user = this.auth.currentUser;
      return user ? toAuthUser(user) : null;
    } catch {
      return null; // flows/auth.md §2: a failed read is signed out
    }
  }

  async signInWithGoogle(): Promise<AuthUser> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(this.auth, provider);
    return toAuthUser(credential.user);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  async getIdToken(): Promise<string | null> {
    await this.restored;
    // getIdToken refreshes an expired token transparently.
    return (await this.auth.currentUser?.getIdToken()) ?? null;
  }
}
