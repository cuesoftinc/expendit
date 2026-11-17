"use client";

/**
 * Tax controller — profile, estimates (authority-resolved), filing wizard
 * (pages.md B7/B7b; tax-engine.md §5/§5.5).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { TaxEstimate, TaxFiling, TaxKind, TaxProfile } from "@/models";
import { taxRepo } from "@/models/repositories";

function useTaxSection<T>(
  orgId: string | undefined,
  load: (options: { orgId: string; signal: AbortSignal }) => Promise<T>,
) {
  const [state, setState] = useState<{
    orgId: string;
    data?: T;
    loading: boolean;
    error: string | null;
  }>();
  const request = useRef<AbortController | null>(null);
  const activeOrg = useRef<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!orgId || activeOrg.current !== orgId) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ orgId, loading: true, error: null });
    try {
      const data = await load({ orgId, signal: controller.signal });
      if (!controller.signal.aborted) {
        setState({ orgId, data, loading: false, error: null });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setState({
          orgId,
          loading: false,
          error: err instanceof Error ? err.message : "Request failed",
        });
      }
    }
  }, [orgId, load]);

  useEffect(() => {
    activeOrg.current = orgId;
    let active = true;
    queueMicrotask(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
      activeOrg.current = undefined;
      request.current?.abort();
    };
  }, [orgId, refresh]);

  const current = state?.orgId === orgId ? state : undefined;
  const setData = useCallback(
    (data: T) => {
      if (!orgId) return;
      setState((previous) =>
        previous?.orgId === orgId
          ? { orgId, data, loading: false, error: null }
          : previous,
      );
    },
    [orgId],
  );

  return {
    data: current?.data,
    loading: current?.loading ?? Boolean(orgId),
    error: current?.error ?? null,
    refresh,
    setData,
  };
}

const NO_ESTIMATES: TaxEstimate[] = [];
const NO_FILINGS: TaxFiling[] = [];

export const useTaxController = (orgId?: string) => {
  const profileSection = useTaxSection(orgId, taxRepo.profile);
  const estimatesSection = useTaxSection(orgId, taxRepo.estimates);
  const filingsSection = useTaxSection(orgId, taxRepo.filings);
  const { setData: setProfile } = profileSection;
  const { refresh: refreshFilings } = filingsSection;

  const updateProfile = useCallback(
    async (patch: Partial<TaxProfile>) => {
      const updated = await taxRepo.updateProfile(patch, { orgId });
      setProfile(updated);
      return updated;
    },
    [orgId, setProfile],
  );

  /** Wizard step 1: draft (422 period_incomplete surfaces to the view). */
  const startFiling = useCallback(
    async (kind: TaxKind, period: string) => {
      const filing = await taxRepo.createFiling({ kind, period }, { orgId });
      await refreshFilings();
      return filing;
    },
    [orgId, refreshFilings],
  );

  /** Wizard final step: generate documents incl. the remittance sheet. */
  const generateFiling = useCallback(
    async (filingId: string) => {
      const filing = await taxRepo.generate(filingId, { orgId });
      await refreshFilings();
      return filing;
    },
    [orgId, refreshFilings],
  );

  return {
    profile: profileSection.data ?? null,
    estimates: estimatesSection.data?.items ?? NO_ESTIMATES,
    filings: filingsSection.data?.items ?? NO_FILINGS,
    profileSection,
    estimatesSection,
    filingsSection,
    updateProfile,
    startFiling,
    generateFiling,
  };
};
