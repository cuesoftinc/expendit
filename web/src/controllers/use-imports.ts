"use client";

/**
 * Imports controller — upload lifecycle (202 + 2s polling with backoff),
 * staged review, confirm/discard (pages.md B3; flows/import.md).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportJob, StagedTransaction } from "@/models";
import { importsRepo } from "@/models/repositories";

export const useImportsController = (orgId?: string) => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [staged, setStaged] = useState<StagedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await importsRepo.list({ orgId });
      setJobs(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load imports");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    if (orgId) queueMicrotask(() => void refresh());
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [orgId, refresh]);

  const openJob = useCallback(
    async (jobId: string) => {
      const detail = await importsRepo.get(jobId, { orgId });
      setActiveJob(detail.job);
      setStaged(detail.staged);
      return detail;
    },
    [orgId],
  );

  /** Poll every 2s with backoff until the job leaves `processing`. */
  const pollJob = useCallback(
    (jobId: string, intervalMs = 2000) => {
      const tick = async () => {
        const detail = await openJob(jobId);
        if (detail.job.status === "processing") {
          pollTimer.current = setTimeout(
            tick,
            Math.min(intervalMs * 1.5, 10000),
          );
        } else {
          await refresh();
        }
      };
      pollTimer.current = setTimeout(tick, intervalMs);
    },
    [openJob, refresh],
  );

  const upload = useCallback(
    async (file: File) => {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const { job_id } = await importsRepo.upload(file, {
        orgId,
        idempotencyKey,
      });
      pollJob(job_id);
      return job_id;
    },
    [orgId, pollJob],
  );

  const correctCategory = useCallback(
    async (stagedId: string, categoryId: string) => {
      const row = await importsRepo.correctCategory(stagedId, categoryId, {
        orgId,
      });
      setStaged((prev) =>
        prev.map((item) => (item.id === stagedId ? row : item)),
      );
    },
    [orgId],
  );

  const setIncludeDuplicate = useCallback(
    async (stagedId: string, include: boolean) => {
      const row = await importsRepo.setIncludeDuplicate(stagedId, include, {
        orgId,
      });
      setStaged((prev) =>
        prev.map((item) => (item.id === stagedId ? row : item)),
      );
    },
    [orgId],
  );

  const confirm = useCallback(
    async (jobId: string) => {
      const result = await importsRepo.confirm(jobId, { orgId });
      await refresh();
      setActiveJob(null);
      setStaged([]);
      return result;
    },
    [orgId, refresh],
  );

  const discard = useCallback(
    async (jobId: string) => {
      await importsRepo.discard(jobId, { orgId });
      await refresh();
      setActiveJob(null);
      setStaged([]);
    },
    [orgId, refresh],
  );

  return {
    jobs,
    activeJob,
    staged,
    loading,
    error,
    refresh,
    openJob,
    pollJob,
    upload,
    correctCategory,
    setIncludeDuplicate,
    confirm,
    discard,
  };
};
