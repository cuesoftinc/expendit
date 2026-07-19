import { describe, expect, it } from "vitest";
import { isArtifactNew } from "./artifact-new";

const NOW = new Date("2026-07-19T12:00:00.000Z");

describe("isArtifactNew (MI-14 ≤24h rule)", () => {
  it("just-created artifacts are NEW", () => {
    expect(isArtifactNew("2026-07-19T11:59:00.000Z", NOW)).toBe(true);
  });

  it("23h59m old is still NEW; 25h old is not", () => {
    expect(isArtifactNew("2026-07-18T12:01:00.000Z", NOW)).toBe(true);
    expect(isArtifactNew("2026-07-18T11:00:00.000Z", NOW)).toBe(false);
  });

  it("future-dated artifacts count as NEW (TEST_MODE mock clock is pinned ahead of real time)", () => {
    // System QA regression: mock-stamped 2026-07-20 vs real 2026-07-19
    // must keep the NEW tag on a freshly generated report.
    expect(isArtifactNew("2026-07-20T11:00:00.000Z", NOW)).toBe(true);
  });

  it("invalid timestamps are never NEW", () => {
    expect(isArtifactNew("not-a-date", NOW)).toBe(false);
  });
});
