"use client";

/**
 * Transactions controller — ledger list state, filters, CRUD, inline
 * category correction (pages.md B2). Views render only.
 */

import { useCallback, useEffect, useState } from "react";
import type { TxnEntry, TxnFilters } from "@/models";
import {
  transactionsRepo,
  type TxnCreate,
  type TxnUpdate,
} from "@/models/repositories";

export const useTransactionsController = (orgId?: string) => {
  const [items, setItems] = useState<TxnEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<TxnFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextFilters: TxnFilters = filters, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const page = await transactionsRepo.list(nextFilters, { orgId });
        setItems((prev) => (append ? [...prev, ...page.items] : page.items));
        setNextCursor(page.next_cursor);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load transactions",
        );
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  );

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    if (orgId) queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const applyFilters = useCallback(
    async (next: TxnFilters) => {
      setFilters(next);
      await load(next);
    },
    [load],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    await load({ ...filters, cursor: nextCursor }, true);
  }, [filters, load, nextCursor]);

  const create = useCallback(
    async (input: TxnCreate) => {
      const txn = await transactionsRepo.create(input, { orgId });
      setItems((prev) => [txn, ...prev]);
      return txn;
    },
    [orgId],
  );

  const update = useCallback(
    async (id: string, patch: TxnUpdate) => {
      const txn = await transactionsRepo.update(id, patch, { orgId });
      setItems((prev) => prev.map((item) => (item.id === id ? txn : item)));
      return txn;
    },
    [orgId],
  );

  const remove = useCallback(
    async (id: string) => {
      await transactionsRepo.remove(id, { orgId });
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [orgId],
  );

  return {
    items,
    nextCursor,
    filters,
    loading,
    error,
    load,
    applyFilters,
    loadMore,
    create,
    update,
    remove,
  };
};
