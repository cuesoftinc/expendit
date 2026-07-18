"use client";

/**
 * GoogleAuthButton — the single X-1 auth CTA (design.md §8.2b, canonical
 * name in every product). Variants: default / hover / pressed / loading /
 * disabled; Google mark + "Continue with Google".
 *
 * Tokens only; the Google 'G' is an approved brand glyph
 * (icon/brand-google — design.md §8.1 iconography note), so its brand
 * colors are a documented raw-hex exception.
 */

import React from "react";

export interface GoogleAuthButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Override label; the canonical CTA copy is the default. */
  label?: string;
}

const GoogleMark = () => (
  // Brand glyph, not Lucide — raw hex allowed here by the iconography rule.
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
    />
  </svg>
);

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  label = "Continue with Google",
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        "inline-flex w-full items-center justify-center gap-3 rounded",
        "border border-border bg-bg px-6 py-3",
        "text-sm font-medium text-text",
        "transition-colors duration-fast ease-standard",
        "hover:bg-bg-elev active:bg-bg-elev",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
      ].join(" ")}
    >
      {loading ? (
        <span
          data-testid="google-auth-loading"
          className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-border border-t-accent motion-reduce:animate-none"
        />
      ) : (
        <GoogleMark />
      )}
      <span>{label}</span>
    </button>
  );
};

export default GoogleAuthButton;
