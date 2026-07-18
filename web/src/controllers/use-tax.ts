"use client";

/**
 * Tax controller — profile, estimates (authority-resolved), filing wizard
 * (pages.md B7/B7b; tax-engine.md §5/§5.5).
 */

import { useCallback, useEffect, useState } from "react";
import type { TaxEstimate, TaxFiling, TaxKind, TaxProfile } from "@/models";
import { taxRepo } from "@/models/repositories";

export const useTaxController = (orgId?: string) => {
  const [profile, setProfile] = useState<TaxProfile | null>(null);
  const [estimates, setEstimates] = useState<TaxEstimate[]>([]);
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, estimatesData, filingsData] = await Promise.all([
        taxRepo.profile({ orgId }),
        taxRepo.estimates({ orgId }),
        taxRepo.filings({ orgId }),
      ]);
      setProfile(profileData);
      setEstimates(estimatesData.items);
      setFilings(filingsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load taxes");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    if (orgId) queueMicrotask(() => void refresh());
  }, [orgId, refresh]);

  const updateProfile = useCallback(
    async (patch: Partial<TaxProfile>) => {
      const updated = await taxRepo.updateProfile(patch, { orgId });
      setProfile(updated);
      return updated;
    },
    [orgId],
  );

  /** Wizard step 1: draft (422 period_incomplete surfaces to the view). */
  const startFiling = useCallback(
    async (kind: TaxKind, period: string) => {
      const filing = await taxRepo.createFiling({ kind, period }, { orgId });
      await refresh();
      return filing;
    },
    [orgId, refresh],
  );

  /** Wizard final step: generate documents incl. the remittance sheet. */
  const generateFiling = useCallback(
    async (filingId: string) => {
      const filing = await taxRepo.generate(filingId, { orgId });
      await refresh();
      return filing;
    },
    [orgId, refresh],
  );

  return {
    profile,
    estimates,
    filings,
    loading,
    error,
    refresh,
    updateProfile,
    startFiling,
    generateFiling,
  };
};
