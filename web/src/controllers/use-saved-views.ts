"use client";

/**
 * Saved filter views controller — B2 ledger (pages.md B2): named filter
 * sets persisted per org (client-side; PLT-001). Controllers own the
 * state; the view renders the picker and save affordance.
 */

import { useCallback, useEffect, useState } from "react";
import type { TxnFilters } from "@/models";

export interface SavedView {
  id: string;
  name: string;
  filters: TxnFilters;
}

const storageKey = (orgId: string) => `expendit.saved-views.${orgId}`;

const read = (orgId: string): SavedView[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(orgId));
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
};

export const useSavedViewsController = (orgId?: string) => {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    if (!orgId) return;
    queueMicrotask(() => setViews(read(orgId)));
  }, [orgId]);

  const persist = useCallback(
    (next: SavedView[]) => {
      setViews(next);
      if (orgId && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(orgId), JSON.stringify(next));
      }
    },
    [orgId],
  );

  const save = useCallback(
    (name: string, filters: TxnFilters) => {
      const view: SavedView = {
        id: `view-${Date.now().toString(36)}`,
        name,
        // cursor/limit are pagination state, not part of a view.
        filters: { ...filters, cursor: undefined, limit: undefined },
      };
      persist([...views, view]);
      return view;
    },
    [persist, views],
  );

  const remove = useCallback(
    (id: string) => persist(views.filter((view) => view.id !== id)),
    [persist, views],
  );

  return { views, save, remove };
};
