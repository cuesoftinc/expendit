import { describe, expect, it } from "vitest";
import { formatMoney, formatMoneyCompact } from "./format";

describe("formatMoney", () => {
  it("formats NGN with tabular decimals", () => {
    expect(formatMoney(1_240_300.5)).toBe("₦1,240,300.50");
  });

  it("preserves the sign on negative amounts (system QA regression: a negative net month rendered positive)", () => {
    expect(formatMoney(-950_000)).toBe("−₦950,000.00");
    expect(formatMoney(-950_000, "NGN", { decimals: 0 })).toBe("−₦950,000");
  });

  it("zero carries no sign", () => {
    expect(formatMoney(0)).toBe("₦0.00");
  });
});

describe("formatMoneyCompact (chart y ticks — Figma Chart/Line master)", () => {
  it("abbreviates magnitudes: ₦0 / ₦2M / ₦550.6K / ₦1.2B", () => {
    expect(formatMoneyCompact(0)).toBe("₦0");
    expect(formatMoneyCompact(2_000_000)).toBe("₦2M");
    expect(formatMoneyCompact(550_600)).toBe("₦550.6K");
    expect(formatMoneyCompact(1_200_000_000)).toBe("₦1.2B");
  });

  it("keeps at most one decimal (₦2.5M, never ₦2.50M)", () => {
    expect(formatMoneyCompact(2_500_000)).toBe("₦2.5M");
    expect(formatMoneyCompact(2_040_000)).toBe("₦2M");
  });

  it("supports two decimals for the donut center total (₦3.61M)", () => {
    expect(formatMoneyCompact(3_614_800, "NGN", { decimals: 2 })).toBe(
      "₦3.61M",
    );
    // Trailing zeros are trimmed — never ₦2.50M.
    expect(formatMoneyCompact(2_500_000, "NGN", { decimals: 2 })).toBe("₦2.5M");
  });

  it("preserves the sign on negative ticks (dipping cash-flow domains)", () => {
    expect(formatMoneyCompact(-2_000_000)).toBe("−₦2M");
    expect(formatMoneyCompact(-2_500_000)).toBe("−₦2.5M");
  });

  it("respects the org currency", () => {
    expect(formatMoneyCompact(4_000_000, "USD")).toBe("$4M");
  });

  it("sub-thousand values render unabbreviated", () => {
    expect(formatMoneyCompact(15)).toBe("₦15");
  });
});
