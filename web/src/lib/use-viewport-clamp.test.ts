import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  VIEWPORT_GUTTER,
  clampShiftX,
  useAnchoredPanelPlacement,
  useViewportShiftX,
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

describe("useAnchoredPanelPlacement (master collision contract 467:11039)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const anchorAt = (rect: Partial<DOMRect>) =>
    ({
      getBoundingClientRect: () => rect as DOMRect,
    }) as HTMLElement;

  const panelSized = (width: number, height: number) =>
    ({
      offsetWidth: width,
      offsetHeight: height,
      clientHeight: height,
      scrollHeight: height,
    }) as HTMLElement;

  it("keeps a fitting panel below and left-anchored", () => {
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("innerHeight", 900);
    const anchorRef = {
      current: anchorAt({ left: 400, right: 544, top: 52, bottom: 84 }),
    };
    const panelRef = { current: panelSized(220, 300) };
    const { result } = renderHook(() =>
      useAnchoredPanelPlacement(true, anchorRef, panelRef),
    );
    expect(result.current).toEqual({
      side: "below",
      alignRight: false,
      maxHeight: undefined,
      shiftX: 0,
    });
  });

  it("right-anchors a right-edge trigger (the Overview header case)", () => {
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("innerHeight", 900);
    // w-36 trigger at the header's right edge: left-anchored, the
    // 220px panel overflowed the right edge and sat flush under it.
    const anchorRef = {
      current: anchorAt({ left: 1272, right: 1416, top: 52, bottom: 84 }),
    };
    const panelRef = { current: panelSized(220, 300) };
    const { result } = renderHook(() =>
      useAnchoredPanelPlacement(true, anchorRef, panelRef),
    );
    expect(result.current).toMatchObject({ alignRight: true, shiftX: 0 });
  });

  it("flips above a bottom-anchored trigger instead of covering it", () => {
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("innerHeight", 900);
    const anchorRef = {
      current: anchorAt({ left: 400, right: 544, top: 700, bottom: 732 }),
    };
    const panelRef = { current: panelSized(220, 300) };
    const { result } = renderHook(() =>
      useAnchoredPanelPlacement(true, anchorRef, panelRef),
    );
    expect(result.current).toMatchObject({
      side: "above",
      maxHeight: undefined,
    });
  });

  it("caps with internal scroll when neither side fits", () => {
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("innerHeight", 300);
    const anchorRef = {
      current: anchorAt({ left: 400, right: 544, top: 40, bottom: 72 }),
    };
    const panelRef = { current: panelSized(220, 320) };
    const { result } = renderHook(() =>
      useAnchoredPanelPlacement(true, anchorRef, panelRef),
    );
    // Below wins (more room): 300 − 8 − 72 − 4 = 216.
    expect(result.current).toMatchObject({ side: "below", maxHeight: 216 });
  });

  it("returns null while closed and resets after closing", () => {
    vi.stubGlobal("innerWidth", 1440);
    vi.stubGlobal("innerHeight", 900);
    const anchorRef = {
      current: anchorAt({ left: 400, right: 544, top: 52, bottom: 84 }),
    };
    const panelRef = { current: panelSized(220, 300) };
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) =>
        useAnchoredPanelPlacement(open, anchorRef, panelRef),
      { initialProps: { open: false } },
    );
    expect(result.current).toBeNull();
    rerender({ open: true });
    expect(result.current).not.toBeNull();
    rerender({ open: false });
    expect(result.current).toBeNull();
  });
});
