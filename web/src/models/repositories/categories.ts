/** Categories repository — CRUD + archive (pages.md B8). */

import type { Category } from "../category";
import { api, type RequestOptions } from "./client";

export type CategoryCreate = Omit<Category, "id" | "org_id" | "archived_at">;
export type CategoryUpdate = Partial<CategoryCreate>;

export interface CategoryListOptions extends RequestOptions {
  /** List the archived registry instead of the active one (B8 Archive tab). */
  archived?: boolean;
}

export const categoriesRepo = {
  /** Active categories by default; `archived: true` lists the archive. */
  list: ({ archived, ...options }: CategoryListOptions = {}) =>
    api.get<{ items: Category[] }>("/categories", {
      ...options,
      query: { ...options.query, ...(archived ? { archived: 1 } : {}) },
    }),

  get: (id: string, options?: RequestOptions) =>
    api.get<Category>(`/categories/${id}`, options),

  create: (input: CategoryCreate, options?: RequestOptions) =>
    api.post<Category>("/categories", input, options),

  update: (id: string, input: CategoryUpdate, options?: RequestOptions) =>
    api.put<Category>(`/categories/${id}`, input, options),

  remove: (id: string, options?: RequestOptions) =>
    api.delete<void>(`/categories/${id}`, options),

  /** Merge tool (pages.md B8): repoint ledger + staged rows, drop source. */
  merge: (id: string, intoCategoryId: string, options?: RequestOptions) =>
    api.post<{ category: Category; moved_transactions: number }>(
      `/categories/${id}/merge`,
      { into: intoCategoryId },
      options,
    ),

  /** Archive (B8 Archive tab) — quiet and reversible, never destructive. */
  archive: (id: string, options?: RequestOptions) =>
    api.post<Category>(`/categories/${id}/archive`, undefined, options),

  /** Restore an archived category to the active registry. */
  unarchive: (id: string, options?: RequestOptions) =>
    api.post<Category>(`/categories/${id}/unarchive`, undefined, options),
};
