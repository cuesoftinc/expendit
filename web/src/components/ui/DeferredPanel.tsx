"use client";

/**
 * DeferredPanel — visibility-gated mount for below-the-fold demo panels
 * (perf pass 2026-07-21, fleet pattern from upstat). The home page
 * hydrated every demo panel eagerly — the A5 persona demo (charts +
 * ledger table) and the three A5a screen-thumb compositions executed
 * inside the load window (live mobile TBT ~310ms). Prerender and first
 * client render emit only a height-reserving placeholder; the real
 * subtree mounts when it approaches the viewport. Environments without
 * IntersectionObserver mount immediately.
 *
 * Marketing-copy sections stay OUTSIDE these wrappers — deferral is for
 * illustrative panels whose markup carries no SEO weight. Above-the-fold
 * panels (the A2 hero embed) stay eager.
 */

import React, { startTransition, useEffect, useRef, useState } from "react";

export interface DeferredPanelProps {
  /**
   * Reserved footprint until the panel mounts (number = px). Mounting
   * happens `rootMargin` before the panel scrolls into view, so the
   * reserve only needs to hold the page's scroll geometry — off-viewport
   * swaps contribute nothing to CLS.
   */
  minHeight: number | string;
  /** How far outside the viewport to start mounting. */
  rootMargin?: string;
  children: React.ReactNode;
  className?: string;
}

export const DeferredPanel: React.FC<DeferredPanelProps> = ({
  minHeight,
  rootMargin = "600px 0px",
  children,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          // transition: a fast scroll can trip several observers at once —
          // the heavy subtree mounts must stay interruptible so they never
          // starve a router navigation (the home CTA handoff).
          startTransition(() => setMounted(true));
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div
      ref={ref}
      data-deferred={mounted ? "mounted" : "pending"}
      className={className}
      style={mounted ? undefined : { minHeight }}
    >
      {mounted ? children : null}
    </div>
  );
};

export default DeferredPanel;
