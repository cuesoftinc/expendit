import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useHomeDemoController } from "./use-home-demo";

const events = () => window.__expenditEvents ?? [];

describe("home demo controller (A5 — personas over the §8.3 datasets)", () => {
  beforeEach(() => {
    window.__expenditEvents = [];
  });

  it("boots on the freelancer dataset (the Figma A5 strip)", () => {
    const { result } = renderHook(() => useHomeDemoController());
    expect(result.current.persona).toBe("freelancer");
    expect(result.current.dataset.stats.income.value).toBe(1_480_000);
  });

  it("switching persona swaps the dataset and emits demo_interact", () => {
    const { result } = renderHook(() => useHomeDemoController());
    act(() => result.current.switchPersona("company"));
    expect(result.current.dataset.stats.income.value).toBe(8_435_200);
    expect(events().at(-1)).toMatchObject({
      event: "demo_interact",
      props: { action: "switch_persona", persona: "company" },
    });
  });

  it("recategorize applies a local override, clears ✨, and emits", () => {
    const { result } = renderHook(() => useHomeDemoController());
    const aiTxn = result.current.txns.find((txn) => txn.ai);
    expect(aiTxn).toBeDefined();
    act(() => result.current.recategorize(aiTxn!.id, "other"));
    const updated = result.current.txns.find((txn) => txn.id === aiTxn!.id);
    expect(updated?.categoryId).toBe("other");
    expect(updated?.ai).toBe(false);
    expect(events().at(-1)).toMatchObject({
      event: "demo_interact",
      props: { action: "recategorize", persona: "freelancer" },
    });
  });

  it("overrides are per-persona and survive a round-trip", () => {
    const { result } = renderHook(() => useHomeDemoController());
    act(() => result.current.recategorize("fl-1", "other"));
    act(() => result.current.switchPersona("sme"));
    expect(
      result.current.txns.find((txn) => txn.id === "fl-1"),
    ).toBeUndefined();
    act(() => result.current.switchPersona("freelancer"));
    expect(
      result.current.txns.find((txn) => txn.id === "fl-1")?.categoryId,
    ).toBe("other");
  });

  it("data-table toggle flips and emits demo_interact", () => {
    const { result } = renderHook(() => useHomeDemoController());
    expect(result.current.showDataTable).toBe(false);
    act(() => result.current.toggleDataTable());
    expect(result.current.showDataTable).toBe(true);
    expect(events().at(-1)).toMatchObject({
      event: "demo_interact",
      props: { action: "toggle_data_table", state: "table" },
    });
  });
});
