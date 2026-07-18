"use client";

/**
 * Ratios controller — report per period + per-metric traces (pages.md B6b;
 * line-items.md §5).
 */

import { useCallback, useState } from "react";
import type { RatioReport, RatioResult } from "@/models";
import { ratiosRepo } from "@/models/repositories";

export const useRatiosController = (orgId?: string) => {
  const [report, setReport] = useState<RatioReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (period: string) => {
      setLoading(true);
      setError(null);
      try {
        setReport(await ratiosRepo.get(period, { orgId }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ratios");
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [orgId],
  );

  const compute = useCallback(
    async (period: string) => {
      setLoading(true);
      setError(null);
      try {
        const computed = await ratiosRepo.compute(period, { orgId });
        setReport(computed);
        return computed;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Compute failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [orgId],
  );

  const trace = useCallback(
    (key: string, period: string): Promise<RatioResult> =>
      ratiosRepo.trace(key, period, { orgId }),
    [orgId],
  );

  return { report, loading, error, load, compute, trace };
};
