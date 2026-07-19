"use client";

/**
 * Anomaly nav badge controller — MI-5: the Transactions nav item carries
 * the anomaly count. Reads anomaly-flagged transactions (no separate
 * endpoint — web-implementation.md §6).
 */

import { useEffect, useState } from "react";
import { transactionsRepo } from "@/models/repositories";

export const useAnomalyBadgeController = (orgId?: string) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    queueMicrotask(() => {
      void transactionsRepo
        .list({ anomaly_only: true, limit: 100 }, { orgId })
        .then((page) => {
          if (!cancelled) setCount(page.items.length);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return { count };
};
