/** Categories repository — CRUD (pages.md B8). */

import type { Category } from "../category";
import { api, type RequestOptions } from "./client";

export type CategoryCreate = Omit<Category, "id" | "org_id">;
export type CategoryUpdate = Partial<CategoryCreate>;

export const categoriesRepo = {
  list: (options?: RequestOptions) =>
    api.get<{ items: Category[] }>("/categories", options),

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
};
