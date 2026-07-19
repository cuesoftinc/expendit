/**
 * Tax entities — docs/data-model.md §5 (TAX_PROFILE, TAX_ESTIMATE,
 * TAX_FILING) + docs/tax-engine.md (rule sets, §5.5 authorities/calendar).
 */

import type { TaxTreatment, VatBasis, VatTreatment } from "./category";

export type TaxKind = "pit" | "cit" | "vat";
export type TaxpayerKind = "individual" | "company";

export interface CategoryTreatment {
  tax_treatment: TaxTreatment;
  vat_treatment: VatTreatment;
  vat_basis: VatBasis;
}

/**
 * The filing-identity completeness predicate — ONE definition shared by
 * the mock generate endpoint and the wizard's data-review gate (Codex
 * review on PR #209: the gate branched on filing kind and checked only
 * TIN, so a company with TIN but no RC sailed past the review step into
 * the 422). Requirements follow the TAXPAYER, not the filing kind
 * (tax-engine.md §5.5): TIN always; companies add RC number + registered
 * address; individuals add state of residence.
 */
export const missingTaxIdentifiers = (
  profile: Pick<
    TaxProfile,
    "taxpayer_kind" | "tin" | "rc_number" | "state_of_residence"
  >,
  org?: { registered_address?: unknown } | null,
): string[] => {
  const missing: string[] = [];
  if (!profile.tin) missing.push("tin");
  if (profile.taxpayer_kind === "company") {
    if (!profile.rc_number) missing.push("rc_number");
    if (!org?.registered_address) missing.push("registered_address");
  } else if (!profile.state_of_residence) {
    missing.push("state_of_residence");
  }
  return missing;
};

export interface TaxProfile {
  id: string;
  org_id: string;
  jurisdiction: "NG";
  taxpayer_kind: TaxpayerKind;
  /** Optional until filing (422 tax_identity_incomplete). */
  tin: string | null;
  /** NG state code; required for individual profiles (resolves State IRS). */
  state_of_residence: string | null;
  /** Company profiles; optional until filing. */
  rc_number: string | null;
  /** Individual profiles; optional. */
  nin: string | null;
  category_treatments: Record<string, CategoryTreatment>;
}

/** Resolved remittance authority (tax-engine.md §5.5) — persisted. */
export interface Authority {
  code: string;
  name: string;
  payment_channels: string[];
}

/** A computed field with its input trace (MI-10 "how we got this"). */
export interface ComputedField {
  key: string;
  label: string;
  value: number;
  formula: string;
  /** Transaction/line-item ids (or user-input markers) behind the figure. */
  inputs: string[];
  notes: string[];
}

export interface TaxEstimate {
  id: string;
  profile_id: string;
  org_id: string;
  kind: TaxKind;
  period: string;
  amount_due: number;
  due_date: string;
  computed_fields: ComputedField[];
  authority: Authority;
  ruleset_id: string;
  /** Estimate banner content — data gaps, v1 limitations. */
  banners: string[];
  computed_at: string;
}

export type FilingStatus = "draft" | "generated" | "submitted" | "accepted";

export interface TaxFiling {
  id: string;
  org_id: string;
  kind: TaxKind;
  period: string;
  status: FilingStatus;
  amount_due: number;
  due_date: string;
  computed_fields: ComputedField[];
  /** Immutable once generated. */
  authority: Authority;
  /** Generated forms incl. the remittance sheet. */
  artifact_key: string | null;
  filed_at: string | null;
  created_at: string;
}

/** B7 tax-calendar row (TaxCalendarRow; MI-13 deadline banner source). */
export interface TaxCalendarEntry {
  kind: TaxKind;
  period: string;
  due_date: string;
  authority: Authority;
}
