/**
 * Marketing section scaffolding — the design.md §2 marketing layout
 * (12-col, max 1200px, alternating light/dark full-bleed sections; dark
 * sections scope `data-theme="dark"` so every child binds tokens only)
 * plus the Afrocentric line motif at 4% opacity on dark editorial
 * surfaces (design.md §2 — an asset, drawn inline as a token-free SVG
 * pattern; documented exception, decorative only).
 *
 * Container pin [Decided 2026-07-19, design.md §2]: every band lays its
 * content in the single centered 1200px container (x 120–1320 on the
 * 1440 frame, min 24px gutters) — hence max-w-[1248px] + px-6 here, so
 * the content box is exactly 1200px wherever the viewport allows.
 */

import React from "react";
import { cn } from "@/lib/cn";

/** Dark editorial section: #0C0C0E in both themes via bg-editorial. */
export const EditorialDark: React.FC<{
  id?: string;
  className?: string;
  children: React.ReactNode;
  /** Line motif (4% opacity) — dark editorial sections only. */
  motif?: boolean;
}> = ({ id, className, children, motif = false }) => (
  <section
    id={id}
    data-theme="dark"
    className={cn("relative overflow-hidden bg-bg-editorial", className)}
  >
    {motif ? <LineMotif /> : null}
    <div className="relative">{children}</div>
  </section>
);

export const SectionInner: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <div
    data-section-inner
    className={cn("mx-auto w-full max-w-[1248px] px-6", className)}
  >
    {children}
  </div>
);

/** Section heading — Display/32 Bold, centered (Figma A3–A10 pattern). */
export const SectionHeading: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h2
    className={cn(
      "text-center font-display text-[28px] font-bold leading-tight tracking-tight text-text md:text-[32px]",
      className,
    )}
  >
    {children}
  </h2>
);

/**
 * Afrocentric line motif — concentric arc strokes at 4% opacity
 * (design.md §2: dark editorial sections only, decorative).
 */
const LineMotif: React.FC = () => (
  <svg
    aria-hidden
    data-testid="line-motif"
    className="pointer-events-none absolute -right-40 -top-40 h-[640px] w-[640px] opacity-[0.04]"
    viewBox="0 0 640 640"
    fill="none"
  >
    {Array.from({ length: 12 }, (_, index) => (
      <circle
        key={index}
        cx="320"
        cy="320"
        r={40 + index * 24}
        className="stroke-text"
        strokeWidth="1.5"
      />
    ))}
  </svg>
);
