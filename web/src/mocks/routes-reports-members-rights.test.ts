// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import {
  GET as listReports,
  POST as createReport,
} from "@/app/api/mock/reports/route";
import { GET as listOrgs, POST as createOrg } from "@/app/api/mock/orgs/route";
import {
  GET as listMembers,
  POST as inviteMember,
} from "@/app/api/mock/orgs/[id]/members/route";
import {
  DELETE as removeMember,
  PATCH as setRole,
} from "@/app/api/mock/orgs/[id]/members/[userId]/route";
import {
  DELETE as cancelPurge,
  GET as purgeStatus,
  POST as requestPurge,
} from "@/app/api/mock/account/purge/route";
import { POST as requestExport } from "@/app/api/mock/account/export/route";
import { GET as exportStatus } from "@/app/api/mock/account/export/[jobId]/route";
import { POST as createTxn } from "@/app/api/mock/transactions/route";
import type { Member, Org, ReportArtifact } from "@/models";
import { resetDb } from "./db";
import { ORG_CUESOFT } from "./seed";
import { json, mockRequest, params } from "./test-helpers";

describe("mock reports (api.md §2, MI-14)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("generates artifacts with a 30-day TTL and validates params", async () => {
    const missingCategory = await createReport(
      mockRequest("/api/mock/reports", {
        method: "POST",
        body: { kind: "category_deep_dive", period: "2026-06", format: "csv" },
      }),
    );
    expect(missingCategory.status).toBe(422);

    const created = await json<ReportArtifact>(
      await createReport(
        mockRequest("/api/mock/reports", {
          method: "POST",
          body: { kind: "monthly_summary", period: "2026-06", format: "pdf" },
        }),
      ),
    );
    expect(created.status).toBe("ready");
    expect(created.signed_url).toBeTruthy();
    expect(
      new Date(created.expires_at).getTime() -
        new Date(created.created_at).getTime(),
    ).toBe(30 * 24 * 60 * 60 * 1000);

    const { items } = await json<{ items: ReportArtifact[] }>(
      await listReports(mockRequest("/api/mock/reports")),
    );
    expect(items.some((artifact) => artifact.id === created.id)).toBe(true);
  });
});

describe("mock orgs + members (engineering.md §2)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("lists the seeded personal + Cuesoft Ltd orgs", async () => {
    const { items } = await json<{ items: Org[] }>(await listOrgs());
    expect(items.map((org) => org.kind).sort()).toEqual([
      "company",
      "personal",
    ]);
    expect(items.find((org) => org.kind === "company")?.name).toBe(
      "Cuesoft Ltd",
    );
  });

  it("company orgs require a registered address state", async () => {
    const response = await createOrg(
      mockRequest("/api/mock/orgs", {
        method: "POST",
        body: { name: "Shellco", kind: "company" },
      }),
    );
    expect(response.status).toBe(422);
  });

  it("member lifecycle: invite pending → role change → remove", async () => {
    const seeded = await json<{ items: Member[] }>(
      await listMembers(
        mockRequest(`/api/mock/orgs/${ORG_CUESOFT}/members`),
        params({ id: ORG_CUESOFT }),
      ),
    );
    expect(seeded.items).toHaveLength(4); // incl. the pending finance@ invite
    expect(seeded.items.filter((m) => m.status === "pending")).toHaveLength(1);

    const invited = await json<Member>(
      await inviteMember(
        mockRequest(`/api/mock/orgs/${ORG_CUESOFT}/members`, {
          method: "POST",
          body: { email: "new@cuesoft.io", role: "member" },
        }),
        params({ id: ORG_CUESOFT }),
      ),
    );
    expect(invited.status).toBe("pending");

    const promoted = await json<Member>(
      await setRole(
        mockRequest(
          `/api/mock/orgs/${ORG_CUESOFT}/members/${invited.user_id}`,
          { method: "PATCH", body: { role: "admin" } },
        ),
        params({ id: ORG_CUESOFT, userId: invited.user_id }),
      ),
    );
    expect(promoted.role).toBe("admin");

    const removed = await removeMember(
      mockRequest(`/api/mock/orgs/${ORG_CUESOFT}/members/${invited.user_id}`, {
        method: "DELETE",
      }),
      params({ id: ORG_CUESOFT, userId: invited.user_id }),
    );
    expect(removed.status).toBe(204);

    // The sole owner cannot be demoted.
    const demoteOwner = await setRole(
      mockRequest(`/api/mock/orgs/${ORG_CUESOFT}/members/user-ibukun`, {
        method: "PATCH",
        body: { role: "member" },
      }),
      params({ id: ORG_CUESOFT, userId: "user-ibukun" }),
    );
    expect(demoteOwner.status).toBe(422);
  });
});

describe("mock data rights (flows/rights.md)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("purge opens a 7-day grace window and blocks writes (409 purge_pending)", async () => {
    const requested = await requestPurge();
    expect(requested.status).toBe(202);

    const write = await createTxn(
      mockRequest("/api/mock/transactions", {
        method: "POST",
        body: {
          description: "blocked",
          amount: 1,
          direction: "expense",
          txn_date: "2026-07-19",
        },
      }),
    );
    expect(write.status).toBe(409);
    const body = await json<{ error: { code: string } }>(write);
    expect(body.error.code).toBe("purge_pending");

    const duplicate = await requestPurge();
    expect(duplicate.status).toBe(409);

    // The open window is readable, so the grace banner + cancel survive a
    // reload (system QA regression — flows/rights.md §2).
    const readBack = await purgeStatus();
    expect(readBack.status).toBe(200);
    const pending = await json<{ status: string; effective_at: string }>(
      readBack,
    );
    expect(pending.status).toBe("pending");
    expect(pending.effective_at).toBeTruthy();

    const cancelled = await cancelPurge();
    expect(cancelled.status).toBe(204);
    const writeAfter = await createTxn(
      mockRequest("/api/mock/transactions", {
        method: "POST",
        body: {
          description: "unblocked",
          amount: 100,
          direction: "expense",
          category_id: "cat-ops",
          txn_date: "2026-07-19",
        },
      }),
    );
    expect(writeAfter.status).toBe(201);

    // Cancelled window reads as gone (200 null — probe endpoint).
    const afterCancel = await purgeStatus();
    expect(afterCancel.status).toBe(200);
    expect(await json(afterCancel)).toBeNull();
  });

  it("export-all: 202 job → determinate progress → completed with a 7-day signed URL", async () => {
    const { job_id } = await json<{ job_id: string }>(await requestExport());
    const poll = async () =>
      json<{
        status: string;
        signed_url: string | null;
        expires_at: string | null;
        record_count?: number | null;
        progress?: number;
      }>(
        await exportStatus(
          mockRequest(`/api/mock/account/export/${job_id}`),
          params({ jobId: job_id }),
        ),
      );
    // First poll: determinate mid-flight ("ZIP · 48%") with the archive's
    // record count (Figma B9b).
    const midway = await poll();
    expect(midway.status).toBe("running");
    expect(midway.progress).toBe(48);
    expect(midway.record_count).toBeGreaterThan(100);
    // Second poll completes with the signed URL.
    const status = await poll();
    expect(status.status).toBe("completed");
    expect(status.progress).toBe(100);
    expect(status.signed_url).toBeTruthy();
    expect(status.expires_at).toBeTruthy();
  });
});
