// SkipLink — fleet canon (SKILL.md a11y closeout canons, 2026-07-21).
// First focusable on every route; visually hidden until keyboard focus;
// the pill appearing on :focus IS the focus indication. Byte-identical
// across products (shared-files canon) — utility names only, no
// product-specific tokens.
import React from "react";

const SkipLink: React.FC = () => (
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:block focus:rounded-md focus:border focus:border-border focus:bg-bg-elev focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-text"
  >
    Skip to content
  </a>
);

export default SkipLink;
