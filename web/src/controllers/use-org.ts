"use client";

/**
 * Org controller — org list + active org context (pages.md Part B: org
 * switcher atop nav; api.md §5: org context via X-Org-Id, absent =
 * personal org).
 */

import { useCallback, useEffect, useState } from "react";
import type { Org } from "@/models";
import { orgsRepo, type OrgCreate } from "@/models/repositories";

const ACTIVE_ORG_KEY = "expendit.active-org";

export const useOrgController = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true); // orgs load on mount — guards must wait
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await orgsRepo.list();
      setOrgs(items);
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(ACTIVE_ORG_KEY)
          : null;
      if (stored && items.some((org) => org.id === stored)) {
        setActiveOrgId(stored);
      } else if (items.length > 0) {
        // Personal org is the default context (api.md §5).
        const personal = items.find((org) => org.kind === "personal");
        setActiveOrgId((personal ?? items[0]).id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orgs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const switchOrg = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    }
  }, []);

  const createOrg = useCallback(
    async (input: OrgCreate) => {
      const org = await orgsRepo.create(input);
      await refresh();
      switchOrg(org.id);
      return org;
    },
    [refresh, switchOrg],
  );

  const activeOrg = orgs.find((org) => org.id === activeOrgId) ?? null;

  return {
    orgs,
    activeOrg,
    activeOrgId,
    loading,
    error,
    refresh,
    switchOrg,
    createOrg,
  };
};
