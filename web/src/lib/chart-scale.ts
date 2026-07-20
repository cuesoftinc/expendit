/**
 * Nice-number axis scale for the bespoke charts (design.md §8.2b; the
 * Figma Chart/Line master's ₦0 / ₦2M / ₦4M / ₦6M ladder): ticks step on
 * a 1 / 2 / 2.5 / 5 × 10^k grid covering the data domain.
 *
 * Bounds snap outward to a step multiple only when the dead band that
 * adds is small (≤ half a step) — so a ₦−130k net-income dip never pulls
 * a ₦46M revenue axis down to −₦20M; the axis keeps the raw bound and
 * the first/last tick sits inside the domain instead (the series may
 * ride slightly past the outer gridline, absorbed by the plot pad).
 */

export interface ChartScale {
  /** Ascending tick values (gridline + label positions). */
  ticks: number[];
  domainMin: number;
  domainMax: number;
}

export const niceScale = (
  min: number,
  max: number,
  targetCount = 4,
): ChartScale => {
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return { ticks: [0], domainMin: 0, domainMax: 1 };
  }
  if (lo === hi) {
    // Degenerate domain — anchor at zero and give it one step of room.
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
    if (lo === hi) return { ticks: [0, 1], domainMin: 0, domainMax: 1 };
  }

  const rawStep = (hi - lo) / Math.max(1, targetCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / magnitude;
  const step =
    (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) *
    magnitude;

  const floorLo = Math.floor(lo / step) * step;
  const ceilHi = Math.ceil(hi / step) * step;
  const domainMin = lo - floorLo <= step / 2 ? floorLo : lo;
  const domainMax = ceilHi - hi <= step / 2 ? ceilHi : hi;

  const epsilon = step * 1e-9;
  const first = Math.ceil((domainMin - epsilon) / step) * step;
  const ticks: number[] = [];
  for (let tick = first; tick <= domainMax + epsilon; tick += step) {
    // Clean float drift; −0 must never label as "−₦0".
    ticks.push(Math.abs(tick) < epsilon ? 0 : Number(tick.toPrecision(12)));
  }
  return { ticks, domainMin, domainMax };
};
