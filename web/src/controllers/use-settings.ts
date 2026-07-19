"use client";

/**
 * Settings controller — org profile, members/roles, data & privacy
 * (export-all USR-001, purge USR-002, consent) — pages.md B9,
 * flows/rights.md.
 */

import { useCallback, useEffect, useState } from "react";
import type { ConsentRecord, Member, OrgRole } from "@/models";
import { orgsRepo, rightsRepo, type OrgUpdate } from "@/models/repositories";

export const useSettingsController = (orgId?: string) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [membersData, consentsData] = await Promise.all([
        orgsRepo.members(orgId, { orgId }),
        rightsRepo.consents({ orgId }),
      ]);
      setMembers(membersData.items);
      setConsents(consentsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const updateOrg = useCallback(
    async (patch: OrgUpdate) => {
      if (!orgId) throw new Error("No active org");
      return orgsRepo.update(orgId, patch, { orgId });
    },
    [orgId],
  );

  const inviteMember = useCallback(
    async (email: string, role: OrgRole) => {
      if (!orgId) throw new Error("No active org");
      const member = await orgsRepo.invite(orgId, { email, role }, { orgId });
      setMembers((prev) => [...prev, member]);
      return member;
    },
    [orgId],
  );

  const setMemberRole = useCallback(
    async (userId: string, role: OrgRole) => {
      if (!orgId) throw new Error("No active org");
      const member = await orgsRepo.setRole(orgId, userId, role, { orgId });
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? member : m)),
      );
      return member;
    },
    [orgId],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!orgId) throw new Error("No active org");
      await orgsRepo.remove(orgId, userId, { orgId });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    },
    [orgId],
  );

  const requestExport = useCallback(
    () => rightsRepo.requestExport({ orgId }),
    [orgId],
  );

  const exportStatus = useCallback(
    (jobId: string) => rightsRepo.exportStatus(jobId, { orgId }),
    [orgId],
  );

  /** MI-15 danger flow: type-to-confirm handled by the view; grace here. */
  const requestPurge = useCallback(
    () => rightsRepo.requestPurge({ orgId }),
    [orgId],
  );

  const cancelPurge = useCallback(
    () => rightsRepo.cancelPurge({ orgId }),
    [orgId],
  );

  /**
   * Pending purge survives reloads: `null` = none on file
   * (flows/rights.md §2 — the grace banner + cancel must persist for the
   * whole window).
   */
  const purgeStatus = useCallback(
    () => rightsRepo.purgeStatus({ orgId }),
    [orgId],
  );

  const recordConsent = useCallback(
    async (document: ConsentRecord["document"], version: string) => {
      const record = await rightsRepo.recordConsent(document, version, {
        orgId,
      });
      setConsents((prev) => [...prev, record]);
      return record;
    },
    [orgId],
  );

  return {
    members,
    consents,
    loading,
    error,
    refresh,
    updateOrg,
    inviteMember,
    setMemberRole,
    removeMember,
    requestExport,
    exportStatus,
    requestPurge,
    cancelPurge,
    purgeStatus,
    recordConsent,
  };
};
