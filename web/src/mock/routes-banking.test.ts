// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { GET as listLinks } from "@/app/api/mock/bank-links/route";
import {
  DELETE as unlink,
  PATCH as patchLink,
} from "@/app/api/mock/bank-links/[id]/route";
import { PUT as exchange } from "@/app/api/mock/bank-links/[id]/exchange/route";
import { POST as syncNow } from "@/app/api/mock/bank-links/[id]/sync/route";
import type { BankLink } from "@/models";
import { getDb, resetDb } from "./db";
import { json, mockRequest, params } from "./test-helpers";

describe("mock bank links (flows/bank-link.md)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("seeds GTBank ···0482 / Zenith ···3306 / Access ···7719 with states", async () => {
    const { items } = await json<{ items: BankLink[] }>(
      await listLinks(mockRequest("/api/mock/bank-links")),
    );
    expect(items.map((link) => link.masked_account)).toEqual([
      "···0482",
      "···3306",
      "···7719",
    ]);
    expect(items.find((l) => l.institution === "Access Bank")?.status).toBe(
      "reauth_required",
    );
    expect(
      items.find((l) => l.institution === "Zenith Bank")?.auto_confirm,
    ).toBe(true);
  });

  it("manual sync: 202 job, then 429 rate_limited within the window", async () => {
    const first = await syncNow(
      mockRequest("/api/mock/bank-links/link-gtb/sync", { method: "POST" }),
      params({ id: "link-gtb" }),
    );
    expect(first.status).toBe(202);
    const second = await syncNow(
      mockRequest("/api/mock/bank-links/link-gtb/sync", { method: "POST" }),
      params({ id: "link-gtb" }),
    );
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBeTruthy();
    const body = await json<{ error: { code: string } }>(second);
    expect(body.error.code).toBe("rate_limited");
  });

  it("reauth_required links refuse manual sync", async () => {
    const response = await syncNow(
      mockRequest("/api/mock/bank-links/link-access/sync", { method: "POST" }),
      params({ id: "link-access" }),
    );
    expect(response.status).toBe(409);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("reauth_required");
  });

  it("pause and resume transitions (data-model.md §6.2)", async () => {
    const paused = await json<BankLink>(
      await patchLink(
        mockRequest("/api/mock/bank-links/link-gtb", {
          method: "PATCH",
          body: { status: "paused" },
        }),
        params({ id: "link-gtb" }),
      ),
    );
    expect(paused.status).toBe("paused");
    const invalid = await patchLink(
      mockRequest("/api/mock/bank-links/link-gtb", {
        method: "PATCH",
        body: { status: "reauth_required" },
      }),
      params({ id: "link-gtb" }),
    );
    expect(invalid.status).toBe(422);
  });

  it("exchange: stale code → 422 link_expired; success activates", async () => {
    const expired = await exchange(
      mockRequest("/api/mock/bank-links/link-gtb/exchange", {
        method: "PUT",
        body: { code: "expired" },
      }),
      params({ id: "link-gtb" }),
    );
    expect(expired.status).toBe(422);
    const body = await json<{ error: { code: string } }>(expired);
    expect(body.error.code).toBe("link_expired");
  });

  it("unlink keep vs purge (BNK-002): purge removes exactly the link's rows", async () => {
    const db = getDb();
    const accessTxns = db.transactions.filter(
      (txn) => txn.source_link_id === "link-access",
    ).length;
    expect(accessTxns).toBeGreaterThan(0);
    const total = db.transactions.length;

    const response = await unlink(
      mockRequest("/api/mock/bank-links/link-access?purge=true", {
        method: "DELETE",
      }),
      params({ id: "link-access" }),
    );
    expect(response.status).toBe(204);
    expect(getDb().transactions.length).toBe(total - accessTxns);

    // keep (default): transactions stay.
    const before = getDb().transactions.length;
    await unlink(
      mockRequest("/api/mock/bank-links/link-zenith", { method: "DELETE" }),
      params({ id: "link-zenith" }),
    );
    expect(getDb().transactions.length).toBe(before);
  });
});
