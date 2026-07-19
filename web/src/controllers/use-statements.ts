"use client";

/**
 * Statements controller — upload/manual entry, mapping review, confirm
 * (pages.md B6; flows/statement-mapping.md).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FinStatement,
  LineItem,
  ManualStatementEntry,
  StatementKind,
} from "@/models";
import { statementsRepo, type MappingPatch } from "@/models/repositories";

export const useStatementsController = (orgId?: string) => {
  const [statements, setStatements] = useState<FinStatement[]>([]);
  const [activeStatement, setActiveStatement] = useState<FinStatement | null>(
    null,
  );
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await statementsRepo.list({ orgId });
      setStatements(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load statements",
      );
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

  const openMapping = useCallback(
    async (statementId: string) => {
      const detail = await statementsRepo.mapping(statementId, { orgId });
      setActiveStatement(detail.statement);
      setLineItems(detail.line_items);
      return detail;
    },
    [orgId],
  );

  /** Poll mapping every 2s until it leaves `processing`. */
  const pollMapping = useCallback(
    (statementId: string, intervalMs = 2000) => {
      const tick = async () => {
        const detail = await openMapping(statementId);
        if (detail.statement.mapping_status === "processing") {
          pollTimer.current = setTimeout(tick, intervalMs);
        }
      };
      pollTimer.current = setTimeout(tick, intervalMs);
    },
    [openMapping],
  );

  const upload = useCallback(
    async (file: File, kind: StatementKind, period: string) => {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const result = await statementsRepo.upload(file, kind, period, {
        orgId,
        idempotencyKey,
      });
      pollMapping(result.statement_id);
      return result;
    },
    [orgId, pollMapping],
  );

  /** Manual rows land directly in staged review (no parse, no AI). */
  const enterManually = useCallback(
    async (entry: ManualStatementEntry) => {
      const result = await statementsRepo.manualEntry(entry, { orgId });
      await openMapping(result.statement_id);
      return result;
    },
    [orgId, openMapping],
  );

  const patchMapping = useCallback(
    async (statementId: string, patch: MappingPatch) => {
      const detail = await statementsRepo.patchMapping(statementId, patch, {
        orgId,
      });
      setActiveStatement(detail.statement);
      setLineItems(detail.line_items);
      return detail;
    },
    [orgId],
  );

  const confirm = useCallback(
    async (statementId: string) => {
      const statement = await statementsRepo.confirm(statementId, { orgId });
      await refresh();
      // Re-read the mapping: confirm runs derivations server-side, so the
      // statement view needs the derived rows (line-items.md §4).
      const detail = await statementsRepo.mapping(statementId, { orgId });
      setActiveStatement(detail.statement);
      setLineItems(detail.line_items);
      return statement;
    },
    [orgId, refresh],
  );

  return {
    statements,
    activeStatement,
    lineItems,
    loading,
    error,
    refresh,
    openMapping,
    pollMapping,
    upload,
    enterManually,
    patchMapping,
    confirm,
  };
};
