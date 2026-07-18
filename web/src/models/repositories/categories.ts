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
};
