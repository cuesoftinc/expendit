/**
 * Tax repository — profile, estimates (with resolved authorities), filing
 * wizard drafts + generation (api.md §5; tax-engine.md §5/§5.5).
 */

import type { TaxEstimate, TaxFiling, TaxKind, TaxProfile } from "../tax";
import { api, type RequestOptions } from "./client";

export const taxRepo = {
  profile: (options?: RequestOptions) =>
    api.get<TaxProfile>("/tax/profile", options),

  updateProfile: (patch: Partial<TaxProfile>, options?: RequestOptions) =>
    api.put<TaxProfile>("/tax/profile", patch, options),

  /** Responses include the resolved remittance-authority block (§5.5). */
  estimates: (options?: RequestOptions) =>
    api.get<{ items: TaxEstimate[] }>("/tax/estimates", options),

  filings: (options?: RequestOptions) =>
    api.get<{ items: TaxFiling[] }>("/tax/filings", options),

  /** Wizard draft (422 period_incomplete on missing months). */
  createFiling: (
    input: { kind: TaxKind; period: string },
    options?: RequestOptions,
  ) => api.post<TaxFiling>("/tax/filings", input, options),

  /**
   * Generate filing documents incl. the remittance sheet — gated on tax
   * identity (422 tax_identity_incomplete), rule-set sign-off
   * (409 ruleset_unsigned), confirmed mappings (422 mapping_unconfirmed).
   */
  generate: (id: string, options?: RequestOptions) =>
    api.post<TaxFiling>(`/tax/filings/${id}/generate`, undefined, options),
};
