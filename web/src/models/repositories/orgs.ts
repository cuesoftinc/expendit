/** Orgs + members repository (api.md §5; engineering.md §2 roles). */

import type { Member, Org, OrgKind, OrgRole, RegisteredAddress } from "../org";
import { api, type RequestOptions } from "./client";

export interface OrgCreate {
  name: string;
  kind: OrgKind;
  currency: string;
  country: string;
  fiscal_year_end?: string;
  registered_address?: RegisteredAddress;
}

export type OrgUpdate = Partial<
  Pick<Org, "name" | "registered_address" | "fiscal_year_end">
>;

export const orgsRepo = {
  list: (options?: RequestOptions) =>
    api.get<{ items: Org[] }>("/orgs", options),

  create: (input: OrgCreate, options?: RequestOptions) =>
    api.post<Org>("/orgs", input, options),

  update: (id: string, patch: OrgUpdate, options?: RequestOptions) =>
    api.patch<Org>(`/orgs/${id}`, patch, options),

  members: (orgId: string, options?: RequestOptions) =>
    api.get<{ items: Member[] }>(`/orgs/${orgId}/members`, options),

  /** Email invite → pending until that email's first sign-in. */
  invite: (
    orgId: string,
    input: { email: string; role: OrgRole },
    options?: RequestOptions,
  ) => api.post<Member>(`/orgs/${orgId}/members`, input, options),

  setRole: (
    orgId: string,
    userId: string,
    role: OrgRole,
    options?: RequestOptions,
  ) => api.patch<Member>(`/orgs/${orgId}/members/${userId}`, { role }, options),

  remove: (orgId: string, userId: string, options?: RequestOptions) =>
    api.delete<void>(`/orgs/${orgId}/members/${userId}`, options),
};
