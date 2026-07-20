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

export interface ViewportShift {
  x: number;
  y: number;
}

const NO_SHIFT: ViewportShift = { x: 0, y: 0 };

/**
 * Two-axis variant of useViewportShiftX — the calendar grids made the
 * PeriodPicker panel tall enough to clip the bottom viewport edge on
 * low anchors (390 canon viewport), so the same 1-D clamp runs on Y
 * too. clampShiftX is axis-agnostic: pass top/bottom + innerHeight.
 */
export const useViewportShiftXY = (
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
): ViewportShift => {
  const [shift, setShift] = useState(NO_SHIFT);

  // Reset when the layer closes — adjust-state-during-render, no effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setShift(NO_SHIFT);
  }

  useLayoutEffect(() => {
    if (!open) return;
    // Mirrors the shift already painted so resize re-measures can
    // recover the unshifted anchor geometry from the live rect.
    let applied = NO_SHIFT;
    const measure = () => {
      const panel = panelRef.current;
      if (!panel || typeof window === "undefined") return;
      const rect = panel.getBoundingClientRect();
      const next = {
        x: clampShiftX(
          rect.left - applied.x,
          rect.right - applied.x,
          window.innerWidth,
        ),
        y: clampShiftX(
          rect.top - applied.y,
          rect.bottom - applied.y,
          window.innerHeight,
        ),
      };
      applied = next;
      setShift((current) =>
        current.x === next.x && current.y === next.y ? current : next,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, panelRef]);

  return shift;
};
