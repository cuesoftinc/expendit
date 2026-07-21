"use client";

/**
 * /signin view — the one auth screen (flows/auth.md §1): a single
 * "Continue with Google" CTA, nothing else. Render-only; state lives in
 * the auth controller.
 */

import React from "react";
import Link from "next/link";
import { useAuthController } from "@/controllers/use-auth";
import { PRIVACY_HUB_URL, TERMS_URL } from "@/components/home/links";
import GoogleAuthButton from "@/components/ui/GoogleAuthButton";
import Wordmark from "@/components/ui/Wordmark";

const SigninView: React.FC = () => {
  const { signInWithGoogle, loading, error } = useAuthController();

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-12 block text-center">
          <Wordmark className="font-display text-2xl font-bold text-text" />
        </Link>

        <h1 className="text-center font-display text-2xl font-semibold tracking-tight text-text">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-text-2">
          Financial intelligence for modern growth.
        </p>

        <div className="mt-8">
          <GoogleAuthButton onClick={signInWithGoogle} loading={loading} />
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-center text-sm text-expense">
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs leading-relaxed text-text-2">
          Google is the only sign-in method — no passwords, ever. By continuing
          you agree to the{" "}
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-text"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href={PRIVACY_HUB_URL}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-text"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </main>
  );
};

export default SigninView;
