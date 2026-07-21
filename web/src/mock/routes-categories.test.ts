// @vitest-environment node

/**
 * Mock /categories archive surface (pages.md B8 Archive tab, ratified
 * 2026-07-21): the default list is the active registry; ?archived=1 is
 * the archive; archive/unarchive are idempotent POST subresources; the
 * merge target must be active.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { GET as listCategories } from "@/app/api/mock/categories/route";
import { POST as archiveCategory } from "@/app/api/mock/categories/[id]/archive/route";
import { POST as unarchiveCategory } from "@/app/api/mock/categories/[id]/unarchive/route";
import { POST as mergeCategory } from "@/app/api/mock/categories/[id]/merge/route";
import type { Category } from "@/models";
import { resetDb } from "./db";
import { json, mockRequest, params } from "./test-helpers";

const listIds = async (query = ""): Promise<string[]> => {
  const res = await listCategories(mockRequest(`/api/mock/categories${query}`));
  const { items } = await json<{ items: Category[] }>(res);
  return items.map((cat) => cat.id);
};

describe("mock /categories archive (B8 Archive tab)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("default list is active-only; ?archived=1 lists the archived registry", async () => {
    const active = await listIds();
    expect(active).toContain("cat-cloud");
    expect(active).not.toContain("cat-conferences");
    expect(active).not.toContain("cat-print");

    const archived = await listIds("?archived=1");
    expect(archived).toEqual(
      expect.arrayContaining(["cat-conferences", "cat-print"]),
    );
    expect(archived).not.toContain("cat-cloud");
  });

  it("archive stamps archived_at (idempotently) and moves the row between lists", async () => {
    const first = await archiveCategory(
      mockRequest("/api/mock/categories/cat-meals/archive", {
        method: "POST",
      }),
      params({ id: "cat-meals" }),
    );
    expect(first.status).toBe(200);
    const stamped = await json<Category>(first);
    // Absolute mock-clock stamp — the seed narrative's "today".
    expect(stamped.archived_at).toBe("2026-07-20T11:00:00.000Z");

    // Idempotent: a second archive keeps the original stamp.
    const again = await json<Category>(
      await archiveCategory(
        mockRequest("/api/mock/categories/cat-meals/archive", {
          method: "POST",
        }),
        params({ id: "cat-meals" }),
      ),
    );
    expect(again.archived_at).toBe(stamped.archived_at);

    expect(await listIds()).not.toContain("cat-meals");
    expect(await listIds("?archived=1")).toContain("cat-meals");
  });

  it("unarchive clears the stamp and restores the row to the active list", async () => {
    const res = await unarchiveCategory(
      mockRequest("/api/mock/categories/cat-conferences/unarchive", {
        method: "POST",
      }),
      params({ id: "cat-conferences" }),
    );
    expect(res.status).toBe(200);
    expect((await json<Category>(res)).archived_at).toBeNull();

    expect(await listIds()).toContain("cat-conferences");
    expect(await listIds("?archived=1")).not.toContain("cat-conferences");
  });

  it("404s on unknown ids and other-org categories", async () => {
    const unknown = await archiveCategory(
      mockRequest("/api/mock/categories/cat-nope/archive", { method: "POST" }),
      params({ id: "cat-nope" }),
    );
    expect(unknown.status).toBe(404);

    // cat-personal-living belongs to the personal org, not Cuesoft.
    const crossOrg = await archiveCategory(
      mockRequest("/api/mock/categories/cat-personal-living/archive", {
        method: "POST",
      }),
      params({ id: "cat-personal-living" }),
    );
    expect(crossOrg.status).toBe(404);
  });

  it("merge refuses an archived target (merge_target_archived)", async () => {
    const res = await mergeCategory(
      mockRequest("/api/mock/categories/cat-meals/merge", {
        method: "POST",
        body: { into: "cat-conferences" },
      }),
      params({ id: "cat-meals" }),
    );
    expect(res.status).toBe(422);
    const envelope = await json<{ error: { code: string } }>(res);
    expect(envelope.error.code).toBe("merge_target_archived");
  });
});
