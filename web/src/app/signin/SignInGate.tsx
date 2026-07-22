"use client";

/**
 * SignInGate — the /signin reverse guard (flows/auth.md §2, ratified
 * 2026-07-22: restore resolves before either surface routes; a signed-in
 * user never sees the auth screen). Wraps the screen content so the page
 * stays a server component (metadata intact): signed in → replace to
 * /dashboard (useRedirectAuthed), session read in flight → an aria-busy
 * hold (per-tab sessionStorage, one microtask — a negligible beat); only
 * signed out renders the CTA. DashboardShell holds the mirror-image gate
 * (useRequireAuth).
 */

import React from "react";
import { useRedirectAuthed } from "@/controllers/use-auth";

const SignInGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, checked } = useRedirectAuthed();

  if (!checked || user) {
    // Covers both the in-flight read and the signed-in replace-in-progress.
    return (
      <div
        aria-busy="true"
        data-testid="signin-gate"
        className="flex min-h-screen items-center justify-center bg-bg"
      >
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
};

export default SignInGate;
