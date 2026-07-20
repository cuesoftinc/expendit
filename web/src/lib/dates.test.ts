import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeAge } from "./dates";

describe("formatRelativeAge (relative ages everywhere, 2026-07-20)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("buckets minutes, hours, days, months and years", () => {
    expect(formatRelativeAge("2026-07-20T11:58:00.000Z")).toBe("2m ago");
    expect(formatRelativeAge("2026-07-20T10:00:00.000Z")).toBe("2h ago");
    expect(formatRelativeAge("2026-07-14T12:00:00.000Z")).toBe("6d ago");
    expect(formatRelativeAge("2026-05-01T12:00:00.000Z")).toBe("2mo ago");
    expect(formatRelativeAge("2024-07-01T12:00:00.000Z")).toBe("2y ago");
  });

  it("clamps future timestamps and sub-minute ages to 'just now'", () => {
    expect(formatRelativeAge("2026-07-20T12:00:30.000Z")).toBe("just now");
    expect(formatRelativeAge("2026-07-21T12:00:00.000Z")).toBe("just now");
  });

  it("passes unparsable input through", () => {
    expect(formatRelativeAge("not-a-date")).toBe("not-a-date");
  });
});
