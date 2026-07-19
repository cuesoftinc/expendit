"use client";

/**
 * Fixed-position anchoring for floating layers that live inside
 * horizontal scroll containers (the mobile canon's `max-lg:overflow-x-auto`
 * table wrappers). An absolutely positioned menu inside a scrollport gets
 * clipped at the container's bottom edge — CSS computes the paired
 * `overflow-y` to `auto` — so these layers portal to <body> and take
 * viewport-fixed coordinates measured from their trigger instead
 * (PR #215 review).
 *
 * The layer tracks its anchor on scroll/resize and clamps into the
 * viewport with the shared 8px gutter: X via clampShiftX; Y by flipping
 * above the anchor when the panel would clip below and space exists.
 */

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { clampShiftX, VIEWPORT_GUTTER } from "./use-viewport-clamp";

export interface AnchoredLayerOptions {
  /** Panel takes the anchor's width (Select); otherwise its own. */
  matchWidth?: boolean;
  /** Gap between anchor and panel (px). */
  offsetY?: number;
}

/**
 * Viewport-fixed position for an open layer anchored to a trigger.
 * Returns null until the first measure paints (the panel renders
 * invisibly for one frame at 0,0 otherwise).
 */
export const useAnchoredLayer = (
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  { matchWidth = false, offsetY = 4 }: AnchoredLayerOptions = {},
): CSSProperties | null => {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  // Reset when the layer closes — adjust-state-during-render, no effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setStyle(null);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || typeof window === "undefined") return;
      const rect = anchor.getBoundingClientRect();
      const width = matchWidth ? rect.width : (panel?.offsetWidth ?? 0);
      const height = panel?.offsetHeight ?? 0;
      const left =
        rect.left +
        clampShiftX(rect.left, rect.left + width, window.innerWidth);
      // Flip above the anchor when the panel clips below and fits above.
      const below = rect.bottom + offsetY;
      const fitsBelow = below + height <= window.innerHeight - VIEWPORT_GUTTER;
      const fitsAbove = rect.top - offsetY - height >= VIEWPORT_GUTTER;
      const top = fitsBelow || !fitsAbove ? below : rect.top - offsetY - height;
      setStyle({
        position: "fixed",
        top,
        left,
        ...(matchWidth ? { width: rect.width } : {}),
      });
    };
    measure();
    // Fixed layers desync from a scrolling anchor — track every scroll
    // (capture reaches the dashboard <main> and the table scrollports)
    // except the panel's own listbox scrolling.
    const onScroll = (event: Event) => {
      if (
        event.target instanceof Node &&
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      measure();
    };
    window.addEventListener("resize", measure);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, anchorRef, panelRef, matchWidth, offsetY]);

  return style;
};
