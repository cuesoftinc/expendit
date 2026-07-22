"use client";

/**
 * Auth controller — feature-scoped orchestration over the AuthProvider
 * interface (X-1 Google-only; flows/auth.md). Views never touch the
 * provider directly.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthProvider } from "@/auth";
import type { AuthUser } from "@/auth/types";

export interface AuthController {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  /** The single X-1 CTA action; lands on /dashboard on success. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Session read with the flows/auth.md §2 failure net: a failed restore
 * reads as **signed out** — a throwing provider can never strand a guard
 * at its loading state. Providers already contract to return null
 * (auth/types.ts); this is the second net.
 */
const readSession = (): AuthUser | null => {
  try {
    return getAuthProvider().currentUser();
  } catch {
    return null;
  }
};

export const useAuthController = (): AuthController => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Microtask keeps the session read out of the synchronous effect body
    // (react-hooks/set-state-in-effect) and off the hydration pass.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setUser(readSession());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const signedIn = await getAuthProvider().signInWithGoogle();
      setUser(signedIn);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  }, [router]);

  const signOut = useCallback(async () => {
    await getAuthProvider().signOut();
    setUser(null);
    router.push("/signin");
  }, [router]);

  return { user, loading, error, signInWithGoogle, signOut };
};

/**
 * Session guard for authed surfaces (Part B): redirects to /signin when
 * no session exists. `checked` distinguishes "still reading the session"
 * from "signed out" so views can hold their loading state.
 */
export const useRequireAuth = (): {
  user: AuthUser | null;
  checked: boolean;
} => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const current = readSession();
      setUser(current);
      setChecked(true);
      if (!current) router.replace("/signin");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checked };
};

/**
 * Reverse guard for /signin (flows/auth.md §2, ratified 2026-07-22): a
 * signed-in user never sees the auth screen — the gate replaces to
 * /dashboard. `checked` distinguishes "still reading the session" from
 * "signed out" so the view (SignInGate) can hold its loading state; a
 * failed read is signed out (readSession), which lands on the sign-in
 * screen itself.
 */
export const useRedirectAuthed = (): {
  user: AuthUser | null;
  checked: boolean;
} => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const current = readSession();
      setUser(current);
      setChecked(true);
      if (current) router.replace("/dashboard");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checked };
};
