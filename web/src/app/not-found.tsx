import React from "react";
import Link from "next/link";

/**
 * 404 — token-true, both themes (system QA 2026-07-19: the legacy
 * purple-gradient page was the last off-brand surface). Editorial-dark
 * like the marketing hero (bg-editorial is #0C0C0E in both modes); the
 * only accent is the brand orange, per the design.md §2 tokens.
 */
const NotFound = () => (
  <div data-theme="dark" className="bg-bg-editorial">
    <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-[13px] tabular-nums tracking-wide text-text-2">
        404 — page not found
      </p>
      <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight text-text md:text-5xl">
        This page doesn’t add up.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-text-2">
        The page you’re looking for was moved, deleted, or never posted to the
        ledger.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors duration-fast ease-standard hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Back to home
        </Link>
        <a
          href="https://github.com/cuesoftinc/expendit/issues"
          target="_blank"
          rel="noreferrer"
          className="rounded px-4 py-2 text-sm font-medium text-text-2 transition-colors duration-fast ease-standard hover:bg-bg-elev hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Report an issue
        </a>
      </div>
    </main>
  </div>
);

export default NotFound;
