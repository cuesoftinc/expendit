/**
 * Categories controller (B8): one controller serves both registry tabs —
 * default lists active, `{ archived: true }` lists the archive; archive
 * and unarchive drop the row from the current list (it belongs to the
 * other routed tab, which refetches on mount).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import type { Category } from "@/models";
import { useCategoriesController } from "./use-categories";
import { categoriesRepo } from "@/models/repositories";

vi.mock("@/models/repositories", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/models/repositories")>();
  return {
    ...mod,
    categoriesRepo: {
      ...mod.categoriesRepo,
      list: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
    },
  };
});

const category = (id: string, archived = false): Category => ({
  id,
  org_id: "org-x",
  name: id,
  type: "expense",
  color: "#6E6E76",
  tax_treatment: "ignore",
  vat_treatment: "exempt",
  vat_basis: "inclusive",
  archived_at: archived ? "2026-03-14T09:30:00.000Z" : null,
});

const listMock = vi.mocked(categoriesRepo.list);
const archiveMock = vi.mocked(categoriesRepo.archive);
const unarchiveMock = vi.mocked(categoriesRepo.unarchive);

afterEach(() => {
  vi.clearAllMocks();
});

describe("useCategoriesController (B8 registry tabs)", () => {
  it("lists the active registry by default", async () => {
    listMock.mockResolvedValue({ items: [category("cat-a")] });
    const { result } = renderHook(() => useCategoriesController("org-x"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listMock).toHaveBeenCalledWith({
      orgId: "org-x",
      archived: false,
    });
    expect(result.current.items.map((item) => item.id)).toEqual(["cat-a"]);
  });

  it("lists the archive with { archived: true }", async () => {
    listMock.mockResolvedValue({ items: [category("cat-z", true)] });
    const { result } = renderHook(() =>
      useCategoriesController("org-x", { archived: true }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listMock).toHaveBeenCalledWith({ orgId: "org-x", archived: true });
    expect(result.current.items[0].archived_at).not.toBeNull();
  });

  it("archive() drops the row from the current (active) list", async () => {
    listMock.mockResolvedValue({
      items: [category("cat-a"), category("cat-b")],
    });
    archiveMock.mockResolvedValue(category("cat-a", true));
    const { result } = renderHook(() => useCategoriesController("org-x"));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.archive("cat-a");
    });
    expect(archiveMock).toHaveBeenCalledWith("cat-a", { orgId: "org-x" });
    expect(result.current.items.map((item) => item.id)).toEqual(["cat-b"]);
  });

  it("unarchive() drops the row from the current (archived) list", async () => {
    listMock.mockResolvedValue({ items: [category("cat-z", true)] });
    unarchiveMock.mockResolvedValue(category("cat-z"));
    const { result } = renderHook(() =>
      useCategoriesController("org-x", { archived: true }),
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.unarchive("cat-z");
    });
    expect(unarchiveMock).toHaveBeenCalledWith("cat-z", { orgId: "org-x" });
    expect(result.current.items).toHaveLength(0);
  });

  it("surfaces list failures through error", async () => {
    listMock.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() =>
      useCategoriesController("org-x", { archived: true }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("network down");
    expect(result.current.items).toHaveLength(0);
  });
});
