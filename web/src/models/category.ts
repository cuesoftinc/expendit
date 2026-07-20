/**
 * Category entity — docs/data-model.md §1 + tax attributes from
 * tax-engine.md §2.3/§4 (per-category tax_treatment / vat_treatment /
 * vat_basis, stored on TAX_PROFILE.category_treatments but surfaced
 * per-category in the UI).
 */

export type CategoryType = "expense" | "income";

/** tax-engine.md §2.3 — how the category enters gross income. */
export type TaxTreatment = "taxable_income" | "exempt" | "ignore";

/** tax-engine.md §4 — VAT treatment of the category's supplies. */
export type VatTreatment = "vatable" | "zero_rated" | "exempt";

/** tax-engine.md §4 — amount convention; ledger default is inclusive. */
export type VatBasis = "inclusive" | "exclusive";

export interface Category {
  id: string;
  org_id: string;
  name: string;
  type: CategoryType;
  /** Color dot (pages.md B8). */
  color: string;
  tax_treatment: TaxTreatment;
  vat_treatment: VatTreatment;
  vat_basis: VatBasis;
  /** AI-proposed, awaiting human confirmation (B8 frame row state). */
  ai_proposed?: boolean;
  /** Proposal provenance, e.g. "AI proposed from 3 vendors". */
  ai_note?: string | null;
  /**
   * Usage this calendar year — derived, list-response enrichment only
   * (B8 merge-safety context: "N transactions this year").
   */
  txn_count_ytd?: number;
}
