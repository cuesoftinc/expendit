/**
 * Mock clock — the seed narrative pins "today" to 20 Jul 2026 so the
 * docs-coherent ledger (July MTD sums, VAT 2026-06 due 21 Jul = T-1
 * deadline banner) renders identically forever.
 */

export const MOCK_TODAY_ISO = "2026-07-20T12:00:00.000+01:00";

export const mockNow = (): Date => new Date(MOCK_TODAY_ISO);

/** ISO string helper anchored to the mock clock. */
export const mockIso = (offsetDays = 0, time = "12:00:00"): string => {
  const base = mockNow();
  base.setDate(base.getDate() + offsetDays);
  const [h, m, s] = time.split(":").map(Number);
  base.setHours(h, m, s, 0);
  return base.toISOString();
};
