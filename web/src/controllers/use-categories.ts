"use client";

/**
 * Categories controller — CRUD + merge tool (pages.md B8). Views render
 * only; 409 category_in_use surfaces through `error` for the delete UX.
 */

import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/models";
import {
  categoriesRepo,
  type CategoryCreate,
  type CategoryUpdate,
} from "@/models/repositories";

export const useCategoriesController = (orgId?: string) => {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: data } = await categoriesRepo.list({ orgId });
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load categories",
      );
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    if (orgId) queueMicrotask(() => void refresh());
  }, [orgId, refresh]);

  const create = useCallback(
    async (input: CategoryCreate) => {
      const category = await categoriesRepo.create(input, { orgId });
      setItems((prev) => [...prev, category]);
      return category;
    },
    [orgId],
  );

  const update = useCallback(
    async (id: string, patch: CategoryUpdate) => {
      const category = await categoriesRepo.update(id, patch, { orgId });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? category : item)),
      );
      return category;
    },
    [orgId],
  );

  /** 409 category_in_use propagates — the view offers merge instead. */
  const remove = useCallback(
    async (id: string) => {
      await categoriesRepo.remove(id, { orgId });
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [orgId],
  );

  const merge = useCallback(
    async (id: string, intoCategoryId: string) => {
      const result = await categoriesRepo.merge(id, intoCategoryId, { orgId });
      setItems((prev) => prev.filter((item) => item.id !== id));
      return result;
    },
    [orgId],
  );

  return { items, loading, error, refresh, create, update, remove, merge };
};
