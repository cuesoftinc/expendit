"use client";

/**
 * Overview controller — B1 aggregates (pages.md B1): StatCard figures,
 * 12-month cash-flow series, category donut totals, anomaly feed, latest
 * transactions. The anomaly feed reads anomaly-flagged transactions — no
 * separate endpoint (web-implementation.md §6).
 */

import { useCallback, useEffect, useState } from "react";
import type {
  CategoryTotalsReport,
  MonthlyFlowReport,
  TaxEstimate,
  TxnEntry,
} from "@/models";
import {
  aggregatesRepo,
  taxRepo,
  transactionsRepo,
} from "@/models/repositories";

export const useOverviewController = (orgId?: string) => {
  const [flows, setFlows] = useState<MonthlyFlowReport | null>(null);
  const [categoryTotals, setCategoryTotals] =
    useState<CategoryTotalsReport | null>(null);
  const [anomalies, setAnomalies] = useState<TxnEntry[]>([]);
  const [latest, setLatest] = useState<TxnEntry[]>([]);
  const [estimates, setEstimates] = useState<TaxEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [flowsData, totalsData, anomalyPage, latestPage, estimatesData] =
        await Promise.all([
          aggregatesRepo.monthly({ orgId }),
          aggregatesRepo.categoryTotals(undefined, { orgId }),
          transactionsRepo.list({ anomaly_only: true, limit: 6 }, { orgId }),
          transactionsRepo.list({ limit: 5 }, { orgId }),
          // MI-13 deadline banner data (nearest due date ≤30d).
          taxRepo.estimates({ orgId }).catch(() => ({ items: [] })),
        ]);
      setFlows(flowsData);
      setCategoryTotals(totalsData);
      setAnomalies(anomalyPage.items);
      setLatest(latestPage.items);
      setEstimates(estimatesData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    if (orgId) queueMicrotask(() => void refresh());
  }, [orgId, refresh]);

  /** Donut month selector (the B1 "Jul 2026" period control). */
  const loadCategoryTotals = useCallback(
    async (month: string) => {
      setCategoryTotals(await aggregatesRepo.categoryTotals(month, { orgId }));
    },
    [orgId],
  );

  return {
    flows,
    categoryTotals,
    anomalies,
    latest,
    estimates,
    loading,
    error,
    refresh,
    loadCategoryTotals,
  };
};
