import { describe, expect, it } from "vitest";
import { metadata } from "./layout";

describe("auth callback layout", () => {
  it("sends no referrer so the handoff code never leaves the origin", () => {
    expect(metadata.referrer).toBe("no-referrer");
  });
});
