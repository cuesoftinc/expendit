"use client";

/**
 * Horizontal viewport collision clamp for the bespoke floating layers
 * (PeriodPicker, OrgSwitcher, CategoryChip). System QA 2026-07-19: the
 * Overview month popover (w-36 trigger, min-w-56 panel, left-anchored)
 * overflowed the right viewport edge and clipped its Apply button.
 *
 * Layers stay absolutely anchored to their trigger; after opening we
 * measure the panel and translate it horizontally so it sits fully
 * inside the viewport with an 8px gutter — at every anchor position.
 * Radix-portaled layers (Tooltip, Modal) already collision-handle and
 * do not need this.
 */

import { useLayoutEffect, useState, type RefObject } from "react";

export const VIEWPORT_GUTTER = 8;

/**
 * Pure clamp: the translate-x that keeps [left, right] inside
 * [gutter, viewportWidth - gutter]. When the panel is wider than the
 * viewport the left edge wins (content starts readable, scroll reaches
 * the rest).
 */
export const clampShiftX = (
  left: number,
  right: number,
  viewportWidth: number,
  gutter: number = VIEWPORT_GUTTER,
): number => {
  let shift = 0;
  if (right > viewportWidth - gutter) shift = viewportWidth - gutter - right;
  if (left + shift < gutter) shift = gutter - left;
  return Math.round(shift);
};

/**
 * Measures the open panel and returns the horizontal shift (px) to apply
 * as `translateX` so it stays fully within the viewport. Re-measures on
 * window resize; resets when the layer closes.
 */
export const useViewportShiftX = (
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
): number => {
  const [shift, setShift] = useState(0);

  // Reset when the layer closes — adjust-state-during-render, no effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setShift(0);
  }

  useLayoutEffect(() => {
    if (!open) return;
    // Mirrors the shift already painted so resize re-measures can
    // recover the unshifted anchor geometry from the live rect.
    let applied = 0;
    const measure = () => {
      const panel = panelRef.current;
      if (!panel || typeof window === "undefined") return;
      const rect = panel.getBoundingClientRect();
      const next = clampShiftX(
        rect.left - applied,
        rect.right - applied,
        window.innerWidth,
      );
      applied = next;
      setShift(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, panelRef]);

  return shift;
};

export interface PanelPlacement {
  /** Vertical side relative to the anchor. */
  side: "below" | "above";
  /** Right-align the panel to the anchor's right edge. */
  alignRight: boolean;
  /** Cap + internal scroll when neither side fits the full panel. */
  maxHeight?: number;
  /** Residual horizontal clamp after alignment (px translate). */
  shiftX: number;
}

/**
 * Placement for a trigger-anchored absolute panel — the DatePicker
 * master's collision contract (467:11039): the popover FLIPS above the
 * field when viewport room below runs out (it never covers the field,
 * and never translates over the page like a raw Y-shift would), caps
 * with internal scroll when neither side fits (an open popover never
 * exceeds the viewport or grows the document scroll height), clamps
 * horizontally at the viewport edges, and right-anchored triggers stay
 * right-anchored. Returns null until the first measure paints (the
 * caller hides the panel for that frame). Replaces the earlier
 * translate-Y clamp, which slid the panel over its own trigger.
 */
export const useAnchoredPanelPlacement = (
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  offsetY: number = 4,
): PanelPlacement | null => {
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);

  // Reset when the layer closes — adjust-state-during-render, no effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setPlacement(null);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel || typeof window === "undefined") return;
      // clientWidth/Height exclude a classic scrollbar (innerWidth does
      // not — the panel used to sit flush under it); jsdom reports 0,
      // so fall back to the window metrics there.
      const viewportW =
        document.documentElement.clientWidth || window.innerWidth;
      const viewportH =
        document.documentElement.clientHeight || window.innerHeight;
      const rect = anchor.getBoundingClientRect();
      const panelW = panel.offsetWidth;
      // Natural panel height even when a previous measure capped it.
      const chromeH = panel.offsetHeight - panel.clientHeight;
      const panelH = Math.max(panel.offsetHeight, panel.scrollHeight + chromeH);
      const spaceBelow = viewportH - VIEWPORT_GUTTER - rect.bottom - offsetY;
      const spaceAbove = rect.top - VIEWPORT_GUTTER - offsetY;
      const side: PanelPlacement["side"] =
        panelH <= spaceBelow || spaceBelow >= spaceAbove ? "below" : "above";
      const space = side === "below" ? spaceBelow : spaceAbove;
      const maxHeight =
        panelH > space ? Math.max(Math.floor(space), 0) : undefined;
      // Master: right-anchored triggers keep their right anchoring.
      const alignRight =
        rect.left + panelW > viewportW - VIEWPORT_GUTTER &&
        rect.right - panelW >= VIEWPORT_GUTTER;
      const left = alignRight ? rect.right - panelW : rect.left;
      const shiftX = clampShiftX(left, left + panelW, viewportW);
      setPlacement((current) =>
        current !== null &&
        current.side === side &&
        current.alignRight === alignRight &&
        current.maxHeight === maxHeight &&
        current.shiftX === shiftX
          ? current
          : { side, alignRight, maxHeight, shiftX },
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, anchorRef, panelRef, offsetY]);

  return placement;
};
