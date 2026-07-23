"use client";

/**
 * Analytics controller — the pages.md Part A event register, emitted
 * toward Upstat (D2, architecture.md §7). Payloads are counters + coarse
 * dimensions only — never amounts, descriptions, or categories
 * (data-model.md privacy rule).
 *
 * TEST_MODE-safe seam: events always land on an in-page queue
 * (window.__expenditEvents) that unit/e2e tests assert against; the
 * network beacon fires only outside TEST_MODE and only when the Upstat
 * ingestion endpoint is configured (NEXT_PUBLIC_UPSTAT_EVENTS_URL — the
 * D2 contract is not yet ratified, so the default build ships queue-only).
 */

import { useCallback, useEffect } from "react";
import { env } from "@/config/env";

export type AnalyticsEvent =
  | "page_view"
  | "try_cloud_click"
  | "self_host_click"
  | "github_click"
  | "demo_interact"
  | "contribute_click"
  | "faq_open";

/** Coarse dimensions only (strings) — the D2 privacy rule. */
export type AnalyticsProps = Record<string, string>;

export interface AnalyticsRecord {
  event: AnalyticsEvent;
  props: AnalyticsProps;
  ts: number;
}

declare global {
  interface Window {
    __expenditEvents?: AnalyticsRecord[];
  }
}

const QUEUE_LIMIT = 200;

const upstatUrl = (): string | undefined =>
  process.env.NEXT_PUBLIC_UPSTAT_EVENTS_URL;

export const trackEvent = (
  event: AnalyticsEvent,
  props: AnalyticsProps = {},
): void => {
  if (typeof window === "undefined") return;
  const record: AnalyticsRecord = { event, props, ts: Date.now() };

  const queue = (window.__expenditEvents ??= []);
  queue.push(record);
  if (queue.length > QUEUE_LIMIT) queue.splice(0, queue.length - QUEUE_LIMIT);

  const url = upstatUrl();
  if (!env.testMode && url && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url, JSON.stringify(record));
  }
};

export interface AnalyticsController {
  track: (event: AnalyticsEvent, props?: AnalyticsProps) => void;
}

export const useAnalyticsController = (): AnalyticsController => ({
  track: useCallback(
    (event: AnalyticsEvent, props: AnalyticsProps = {}) =>
      trackEvent(event, props),
    [],
  ),
});

/** Emits `page_view` once per mount (pages.md Part A event register). */
export const usePageView = (page: string): void => {
  useEffect(() => {
    trackEvent("page_view", { page });
  }, [page]);
};
