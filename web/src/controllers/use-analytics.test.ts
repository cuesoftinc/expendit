import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  trackEvent,
  useAnalyticsController,
  usePageView,
} from "./use-analytics";

describe("analytics controller (pages.md Part A events, TEST_MODE-safe)", () => {
  beforeEach(() => {
    window.__expenditEvents = [];
  });

  it("queues events on window.__expenditEvents", () => {
    trackEvent("try_cloud_click", { source: "hero" });
    expect(window.__expenditEvents).toHaveLength(1);
    expect(window.__expenditEvents?.[0]).toMatchObject({
      event: "try_cloud_click",
      props: { source: "hero" },
    });
  });

  it("does not beacon in TEST_MODE (the only network seam)", () => {
    const sendBeacon = vi.fn();
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeacon,
      writable: true,
      configurable: true,
    });
    trackEvent("github_click");
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("controller track() lands on the queue", () => {
    const { result } = renderHook(() => useAnalyticsController());
    result.current.track("faq_open", { question: "license" });
    expect(window.__expenditEvents?.at(-1)).toMatchObject({
      event: "faq_open",
      props: { question: "license" },
    });
  });

  it("usePageView emits page_view once per mount", () => {
    const { rerender } = renderHook(() => usePageView("home"));
    rerender();
    const pageViews = window.__expenditEvents?.filter(
      (record) => record.event === "page_view",
    );
    expect(pageViews).toHaveLength(1);
    expect(pageViews?.[0]?.props).toEqual({ page: "home" });
  });
});
