"use client";

/**
 * Categories controller — CRUD + merge tool + archive (pages.md B8).
 * Views render only; 409 category_in_use surfaces through `error` for
 * the delete UX. One controller serves both registry tabs: the default
 * lists active categories, `{ archived: true }` lists the archive.
 * Archive/unarchive each drop the row from the current list (it now
 * belongs to the other tab; routed tabs refetch on mount).
 */

import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/models";
import {
  categoriesRepo,
  type CategoryCreate,
  type CategoryUpdate,
} from "@/models/repositories";

export interface CategoriesControllerOptions {
  /** List the archived registry (B8 Archive tab) instead of the active one. */
  archived?: boolean;
}

export const useCategoriesController = (
  orgId?: string,
  { archived = false }: CategoriesControllerOptions = {},
) => {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: data } = await categoriesRepo.list({ orgId, archived });
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load categories",
      );
    } finally {
      setLoading(false);
    }
  }, [orgId, archived]);

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

  /** Quiet + reversible — the row moves to the Archive tab. */
  const archiveCategory = useCallback(
    async (id: string) => {
      const category = await categoriesRepo.archive(id, { orgId });
      setItems((prev) => prev.filter((item) => item.id !== id));
      return category;
    },
    [orgId],
  );

  /** Restores an archived row to the active registry. */
  const unarchiveCategory = useCallback(
    async (id: string) => {
      const category = await categoriesRepo.unarchive(id, { orgId });
      setItems((prev) => prev.filter((item) => item.id !== id));
      return category;
    },
    [orgId],
  );

  return {
    items,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    merge,
    archive: archiveCategory,
    unarchive: unarchiveCategory,
  };
};
