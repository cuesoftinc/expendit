/**
 * SkipLink — fleet canon (a11y audit 2026-07-21, P15): the first
 * focusable element on every route; visually hidden until keyboard
 * focus, then a small pill at the top-left. Targets the page's
 * `<main id="main" tabIndex={-1}>` so activation moves focus into the
 * content past the navigation chrome.
 *
 * Construction is shared across the fleet — tokens only, no
 * product-specific classes — so the file stays byte-identical in every
 * product.
 */

import React from "react";

export const SkipLink: React.FC = () => (
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-toast focus:rounded focus:border focus:border-border focus:bg-bg focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-text focus:outline-none focus:ring-2 focus:ring-accent"
  >
    Skip to main content
  </a>
);

export default SkipLink;
