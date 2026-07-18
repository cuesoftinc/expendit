/**
 * Remittance-authority registry — docs/tax-engine.md §5.5 (rules-as-data,
 * sign-off-gated). Estimates and filings persist their resolved authority
 * so historical records survive registry changes.
 */

import type { Authority, TaxKind, TaxpayerKind } from "../tax";

export const FIRS: Authority = {
  code: "FIRS",
  name: "Federal Inland Revenue Service",
  payment_channels: ["TaxPro-Max portal", "Remita"],
};

/** State IRS registry (NG-first; LIRS is the built exemplar). */
export const STATE_IRS: Record<string, Authority> = {
  "NG-LA": {
    code: "LIRS",
    name: "Lagos State Internal Revenue Service",
    payment_channels: ["LIRS eTax portal"],
  },
};

/**
 * Authority resolution (tax-engine.md §5.5):
 * pit + resident individual → State IRS of state_of_residence;
 * cit (+ levy) and vat → FIRS. Unknown state → FIRS (edge cases prompt
 * review per the rule-set param).
 */
export const resolveAuthority = (
  kind: TaxKind,
  taxpayerKind: TaxpayerKind,
  stateOfResidence: string | null,
): Authority => {
  if (kind === "pit" && taxpayerKind === "individual" && stateOfResidence) {
    return STATE_IRS[stateOfResidence] ?? FIRS;
  }
  return FIRS;
};

/** Filing-calendar due rules (tax-engine.md §5.5, rule-set params). */
export const FILING_CALENDAR: Record<
  TaxKind,
  { frequency: "annual" | "monthly"; due_rule: string }
> = {
  pit: { frequency: "annual", due_rule: "03-31" },
  cit: { frequency: "annual", due_rule: "fy_end+6m" },
  vat: { frequency: "monthly", due_rule: "next_month_21" },
};
