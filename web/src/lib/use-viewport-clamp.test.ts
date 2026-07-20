import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  VIEWPORT_GUTTER,
  clampShiftX,
  useViewportShiftX,
  useViewportShiftXY,
} from "./use-viewport-clamp";

describe("clampShiftX (floating-layer viewport clamp)", () => {
  it("returns 0 when the panel already fits", () => {
    expect(clampShiftX(100, 300, 1440)).toBe(0);
  });

  it("shifts left when the panel overflows the right edge", () => {
    // The Overview regression: trigger at 1272, min-w-56 panel → right
    // edge 1496 at a 1440 viewport. Clamp pulls it back inside.
    expect(clampShiftX(1272, 1496, 1440)).toBe(1440 - VIEWPORT_GUTTER - 1496);
  });

  it("shifts right when the panel overflows the left edge", () => {
    expect(clampShiftX(-20, 160, 390)).toBe(VIEWPORT_GUTTER - -20);
  });

  it("lets the left edge win when the panel is wider than the viewport", () => {
    expect(clampShiftX(10, 500, 390)).toBe(VIEWPORT_GUTTER - 10);
  });

  it("honors a custom gutter", () => {
    expect(clampShiftX(0, 100, 1440, 0)).toBe(0);
  });
});

describe("useViewportShiftX", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const panelAt = (left: number, right: number) =>
    ({
      getBoundingClientRect: () => ({ left, right }) as DOMRect,
    }) as HTMLElement;

  it("measures the open panel and clamps it into the viewport", () => {
    vi.stubGlobal("innerWidth", 1440);
    const ref = { current: panelAt(1272, 1496) };
    const { result } = renderHook(
      ({ open }: { open: boolean }) => useViewportShiftX(open, ref),
      { initialProps: { open: true } },
    );
    expect(result.current).toBe(1440 - VIEWPORT_GUTTER - 1496);
  });

  it("returns 0 while closed and resets after closing", () => {
    vi.stubGlobal("innerWidth", 1440);
    const ref = { current: panelAt(1272, 1496) };
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useViewportShiftX(open, ref),
      { initialProps: { open: false } },
    );
    expect(result.current).toBe(0);
    rerender({ open: true });
    expect(result.current).not.toBe(0);
    rerender({ open: false });
    expect(result.current).toBe(0);
  });

  it("re-measures on window resize using the unshifted geometry", () => {
    vi.stubGlobal("innerWidth", 1440);
    const ref = { current: panelAt(1272, 1496) };
    const { result } = renderHook(() => useViewportShiftX(true, ref));
    const first = result.current;
    expect(first).toBeLessThan(0);

    // The viewport grows: the panel fits again, so the shift is removed
    // (the live rect includes the applied shift; the hook subtracts it).
    vi.stubGlobal("innerWidth", 1600);
    ref.current = panelAt(1272 + first, 1496 + first);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe(0);
  });
});

describe("useViewportShiftXY (two-axis clamp for the calendar panels)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const panelAt = (rect: Partial<DOMRect>) =>
    ({
      getBoundingClientRect: () => rect as DOMRect,
    }) as HTMLElement;

  it("clamps both axes independently", () => {
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("innerHeight", 900);
    const ref = {
      current: panelAt({ left: 1272, right: 1496, top: 700, bottom: 1020 }),
    };
    const { result } = renderHook(() => useViewportShiftXY(true, ref));
    expect(result.current).toEqual({
      x: 1440 - VIEWPORT_GUTTER - 1496,
      y: 900 - VIEWPORT_GUTTER - 1020,
    });
  });

  it("returns zero shift for an in-viewport panel and resets on close", () => {
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("innerHeight", 900);
    const ref = {
      current: panelAt({ left: 400, right: 624, top: 100, bottom: 420 }),
    };
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useViewportShiftXY(open, ref),
      { initialProps: { open: true } },
    );
    expect(result.current).toEqual({ x: 0, y: 0 });
    ref.current = panelAt({ left: 1272, right: 1496, top: 700, bottom: 1020 });
    rerender({ open: false });
    expect(result.current).toEqual({ x: 0, y: 0 });
  });
});
