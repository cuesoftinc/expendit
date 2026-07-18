/**
 * Org + membership entities — docs/data-model.md §5 (ORG, ORG_MEMBER).
 * Field names mirror the API contract (snake_case).
 */

export type OrgKind = "personal" | "company";

export interface RegisteredAddress {
  line1: string;
  line2?: string;
  city: string;
  /** NG state code, e.g. "NG-LA" — required (CIT/VAT authority resolution). */
  state: string;
  country: string;
}

export interface Org {
  id: string;
  name: string;
  kind: OrgKind;
  currency: string;
  country: string;
  /** MM-DD, default 12-31 — defines FYYYYY periods (line-items.md §6). */
  fiscal_year_end: string;
  /** Company orgs only; high-sensitivity (data-model.md §4). */
  registered_address?: RegisteredAddress;
  created_at: string;
}

export type OrgRole = "owner" | "admin" | "member";

export interface Member {
  org_id: string;
  user_id: string;
  name: string;
  email: string;
  role: OrgRole;
  /** Email invites are pending until that email's first sign-in (api.md §5). */
  status: "active" | "pending";
  joined_at: string | null;
}
