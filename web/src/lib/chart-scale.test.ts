import { describe, expect, it } from "vitest";
import { niceScale } from "./chart-scale";

describe("niceScale (chart y-axis, design.md §8.2b construction)", () => {
  it("reproduces the Figma master ladder (₦0 / 2M / 4M / 6M) for a 0..~5.2M domain", () => {
    const scale = niceScale(0, 5_200_000);
    expect(scale.ticks).toEqual([0, 2_000_000, 4_000_000, 6_000_000]);
    expect(scale.domainMin).toBe(0);
    expect(scale.domainMax).toBe(6_000_000);
  });

  it("handles the personal org's negative dip (−1,134,650 .. 1,529,700)", () => {
    const scale = niceScale(-1_134_650, 1_529_700);
    expect(scale.ticks).toEqual([-1_000_000, 0, 1_000_000, 2_000_000]);
    // The bottom keeps the raw bound — flooring to −2M would waste
    // most of a step below the data.
    expect(scale.domainMin).toBe(-1_134_650);
    expect(scale.domainMax).toBe(2_000_000);
  });

  it("handles the company org's burn months (−2.61M .. 4.82M) on a 2.5M step", () => {
    const scale = niceScale(-2_610_000, 4_820_400);
    expect(scale.ticks).toEqual([-2_500_000, 0, 2_500_000, 5_000_000]);
    expect(scale.domainMin).toBe(-2_610_000);
    expect(scale.domainMax).toBe(5_000_000);
  });

  it("a tiny negative dip never drags the axis a whole step down (trends: −130k dip on a ₦46.5M revenue axis)", () => {
    const scale = niceScale(-130_000, 46_500_000);
    expect(scale.ticks).toEqual([0, 20_000_000, 40_000_000]);
    expect(scale.domainMin).toBe(-130_000);
    expect(scale.domainMax).toBe(46_500_000);
  });

  it("zero never renders as −0", () => {
    const scale = niceScale(-3, 3);
    expect(scale.ticks).toContainEqual(0);
    expect(scale.ticks.some((tick) => Object.is(tick, -0))).toBe(false);
  });

  it("degenerate domains stay renderable", () => {
    expect(niceScale(0, 0)).toEqual({
      ticks: [0, 1],
      domainMin: 0,
      domainMax: 1,
    });
    expect(niceScale(5, 5).ticks).toEqual([0, 2, 4, 6]);
    expect(niceScale(Number.NaN, 3)).toEqual({
      ticks: [0],
      domainMin: 0,
      domainMax: 1,
    });
  });

  it("small unit domains (component gallery) tick cleanly", () => {
    expect(niceScale(0, 15).ticks).toEqual([0, 5, 10, 15]);
  });
});
