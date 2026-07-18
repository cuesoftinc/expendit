"use client";

/**
 * Reports controller — artifact generation + TTL'd history (pages.md B5;
 * MI-14 lifecycle owned here, rendered by views).
 */

import { useCallback, useEffect, useState } from "react";
import type { ReportArtifact } from "@/models";
import { reportsRepo, type ReportRequest } from "@/models/repositories";

export const useReportsController = (orgId?: string) => {
  const [artifacts, setArtifacts] = useState<ReportArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await reportsRepo.list({ orgId });
      setArtifacts(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    if (orgId) queueMicrotask(() => void refresh());
  }, [orgId, refresh]);

  const generate = useCallback(
    async (input: ReportRequest) => {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const artifact = await reportsRepo.create(input, {
        orgId,
        idempotencyKey,
      });
      setArtifacts((prev) => [artifact, ...prev]);
      return artifact;
    },
    [orgId],
  );

  return { artifacts, loading, error, refresh, generate };
};
