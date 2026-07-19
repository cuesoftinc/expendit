import { describe, expect, it } from "vitest";
import { formatMoney } from "./format";

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
