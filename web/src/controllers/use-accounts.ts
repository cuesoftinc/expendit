"use client";

/**
 * Accounts controller — bank-link lifecycle: link/exchange/sync/pause/
 * unlink (pages.md B4; flows/bank-link.md).
 */

import { useCallback, useEffect, useState } from "react";
import type { BankLink } from "@/models";
import { bankLinksRepo } from "@/models/repositories";

export const useAccountsController = (orgId?: string) => {
  const [links, setLinks] = useState<BankLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await bankLinksRepo.list({ orgId });
      setLinks(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    if (orgId) queueMicrotask(() => void refresh());
  }, [orgId, refresh]);

  /** Start the MI-9 flow: pending link + provider widget config. */
  const startLink = useCallback(() => bankLinksRepo.create({ orgId }), [orgId]);

  /** Widget success code → active link; initial sync enqueued server-side. */
  const exchange = useCallback(
    async (linkId: string, code: string) => {
      const link = await bankLinksRepo.exchange(linkId, code, { orgId });
      await refresh();
      return link;
    },
    [orgId, refresh],
  );

  const syncNow = useCallback(
    (linkId: string) => bankLinksRepo.sync(linkId, { orgId }),
    [orgId],
  );

  const setPaused = useCallback(
    async (linkId: string, paused: boolean) => {
      await bankLinksRepo.update(
        linkId,
        { status: paused ? "paused" : "active" },
        { orgId },
      );
      await refresh();
    },
    [orgId, refresh],
  );

  const setAutoConfirm = useCallback(
    async (linkId: string, autoConfirm: boolean) => {
      await bankLinksRepo.update(
        linkId,
        { auto_confirm: autoConfirm },
        { orgId },
      );
      await refresh();
    },
    [orgId, refresh],
  );

  /** Unlink with the keep-or-purge history choice (MI-15 when purging). */
  const unlink = useCallback(
    async (linkId: string, purge: boolean) => {
      await bankLinksRepo.unlink(linkId, purge, { orgId });
      await refresh();
    },
    [orgId, refresh],
  );

  return {
    links,
    loading,
    error,
    refresh,
    startLink,
    exchange,
    syncNow,
    setPaused,
    setAutoConfirm,
    unlink,
  };
};
