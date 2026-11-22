import { describe, expect, it, vi } from "vitest";
import { executeBulkAction } from "./bulk-action";

describe("executeBulkAction", () => {
  it("reports full success and clears all ids when every mutation resolves", async () => {
    const mutate = vi.fn().mockResolvedValue(undefined);
    const out = await executeBulkAction(
      ["txn-1", "txn-2"],
      "re-categorized",
      mutate,
    );
    expect(out.succeeded).toEqual(["txn-1", "txn-2"]);
    expect(out.failed).toEqual([]);
    expect(out.message).toBe("2 transactions re-categorized");
  });

  it("uses singular grammar for a single succeeded transaction", async () => {
    const out = await executeBulkAction(["txn-1"], "deleted", async () => {});
    expect(out.message).toBe("1 transaction deleted");
  });

  it("reports partial failure and keeps only failed ids", async () => {
    const mutate = vi.fn(async (id: string) => {
      if (id === "txn-2") throw new Error("server 500");
    });
    const out = await executeBulkAction(
      ["txn-1", "txn-2", "txn-3"],
      "deleted",
      mutate,
    );
    expect(out.succeeded).toEqual(["txn-1", "txn-3"]);
    expect(out.failed).toEqual(["txn-2"]);
    expect(out.message).toBe(
      "2 of 3 transactions deleted. Retry the failed transactions.",
    );
  });

  it("reports total failure and retains every id when all mutations reject", async () => {
    const mutate = vi.fn().mockRejectedValue(new Error("network"));
    const out = await executeBulkAction(
      ["txn-1", "txn-2"],
      "re-categorized",
      mutate,
    );
    expect(out.succeeded).toEqual([]);
    expect(out.failed).toEqual(["txn-1", "txn-2"]);
    expect(out.message).toBe(
      "0 of 2 transactions re-categorized. Retry the failed transactions.",
    );
  });
});
