import { describe, expect, it } from "vitest";
import { DEMO_DATASETS, DEMO_PERSONAS } from "./demo";

/**
 * §8.3 synthetic demo datasets — internal-consistency contract: the A5
 * strip must never show numbers that disagree with each other (design.md
 * as-built note: per-persona internally consistent datasets).
 */
describe("demo datasets (design.md §8.3 ×3)", () => {
  it("ships all three personas", () => {
    expect(DEMO_PERSONAS).toEqual(["freelancer", "sme", "company"]);
    for (const persona of DEMO_PERSONAS) {
      expect(DEMO_DATASETS[persona].persona).toBe(persona);
    }
  });

  it.each(DEMO_PERSONAS)("%s: net = income − expenses", (persona) => {
    const { stats } = DEMO_DATASETS[persona];
    expect(stats.net.value).toBe(stats.income.value - stats.expenses.value);
  });

  it.each(DEMO_PERSONAS)(
    "%s: donut slices sum to the expenses stat",
    (persona) => {
      const { donut, stats } = DEMO_DATASETS[persona];
      const total = donut.slices.reduce((sum, slice) => sum + slice.value, 0);
      expect(total).toBe(stats.expenses.value);
    },
  );

  it.each(DEMO_PERSONAS)(
    "%s: every txn references a registry category",
    (persona) => {
      const { categories, txns } = DEMO_DATASETS[persona];
      const ids = new Set(categories.map((category) => category.id));
      for (const txn of txns) {
        expect(ids.has(txn.categoryId)).toBe(true);
      }
    },
  );

  it.each(DEMO_PERSONAS)("%s: 12-month cash-flow series", (persona) => {
    expect(DEMO_DATASETS[persona].cashflow.points).toHaveLength(12);
  });

  it("company dataset mirrors the seed narrative (seed.ts July 2026 MTD)", () => {
    const { stats } = DEMO_DATASETS.company;
    expect(stats.income.value).toBe(8_435_200);
    expect(stats.expenses.value).toBe(3_614_800);
    expect(stats.net.value).toBe(4_820_400);
  });
});
