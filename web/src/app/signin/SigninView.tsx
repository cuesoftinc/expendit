"use client";

/**
 * /signin view — the one auth screen (flows/auth.md §1, Figma 178:19):
 * a bordered card with the Wordmark, "Sign in to your workspace", the
 * frame subtitle, a single "Continue with Google" CTA and the two-line
 * microcopy. Render-only; state lives in the auth controller.
 */

import React from "react";
import Link from "next/link";
import { useAuthController } from "@/controllers/use-auth";
import GoogleAuthButton from "@/components/ui/GoogleAuthButton";
import Wordmark from "@/components/ui/Wordmark";

const SigninView: React.FC = () => {
  const { signInWithGoogle, loading, error } = useAuthController();

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      {/* Bordered card (Figma 178:19). */}
      <div className="w-full max-w-sm rounded border border-border bg-bg px-6 py-8">
        <Link href="/" className="mb-10 block text-center">
          <Wordmark className="font-display text-2xl font-bold text-text" />
        </Link>

        <h1 className="text-center font-display text-2xl font-semibold tracking-tight text-text">
          Sign in to your workspace
        </h1>
        <p className="mt-2 text-center text-sm text-text-2">
          Statements, ratios and taxes — one account.
        </p>

        <div className="mt-8">
          <GoogleAuthButton onClick={signInWithGoogle} loading={loading} />
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-center text-sm text-expense">
            {error}
          </p>
        ) : null}

        {/* Two-line microcopy (frame): auth model, then legal. */}
        <p className="mt-6 text-center text-xs leading-relaxed text-text-2">
          Google sign-in only — no passwords to manage.
        </p>
        <p className="mt-1 text-center text-xs leading-relaxed text-text-2">
          By continuing you agree to the{" "}
          <Link href="/" className="underline hover:text-text">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/" className="underline hover:text-text">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
};

export default SigninView;
