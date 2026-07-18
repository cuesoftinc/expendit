/**
 * Mock tax engine — NG rule sets as data (tax-engine.md): PIT 2026 bands,
 * CIT 2026 classification + development levy, VAT 7.5% inclusive
 * convention, §5.5 authority resolution + filing calendar, and the wizard
 * gates (period_incomplete / ruleset_unsigned / mapping_unconfirmed /
 * tax_identity_incomplete).
 */

import type { ComputedField, TaxEstimate, TaxKind, TaxProfile } from "@/models";
import { resolveAuthority } from "@/models/registry/authorities";
import { mockNow } from "./clock";
import { getDb, nextId, type MockDb } from "./db";

/** Rule-set registry (versioned, sign-off-gated — tax-engine.md §1). */
export const RULESETS: Record<
  string,
  { id: string; kind: TaxKind; signed: boolean }
> = {
  "ng-pit-2026": { id: "ng-pit-2026", kind: "pit", signed: false },
  "ng-pit-legacy": { id: "ng-pit-legacy", kind: "pit", signed: false },
  "ng-cit-2026": { id: "ng-cit-2026", kind: "cit", signed: true },
  "ng-cit-legacy": { id: "ng-cit-legacy", kind: "cit", signed: true },
  "ng-vat-2026": { id: "ng-vat-2026", kind: "vat", signed: true },
};

/** Period → rule set, by the period's start date (tax-engine.md §1). */
export const resolveRuleset = (kind: TaxKind, period: string): string => {
  const yearMatch = period.match(/^(?:FY)?(\d{4})/);
  const year = yearMatch ? Number(yearMatch[1]) : 2026;
  // FYYYYY starts the previous calendar year only for non-12-31 year ends;
  // the seed's orgs use the 12-31 default, so FYYYYY starts YYYY-01-01.
  if (kind === "pit") return year >= 2026 ? "ng-pit-2026" : "ng-pit-legacy";
  if (kind === "cit") return year >= 2026 ? "ng-cit-2026" : "ng-cit-legacy";
  return "ng-vat-2026";
};

/** PIT bands, ng-pit-2026 (annual ₦ — tax-engine.md §2.1). */
const PIT_2026_BANDS: Array<{ upTo: number | null; rate: number }> = [
  { upTo: 800_000, rate: 0 },
  { upTo: 3_000_000, rate: 0.15 },
  { upTo: 12_000_000, rate: 0.18 },
  { upTo: 25_000_000, rate: 0.21 },
  { upTo: 50_000_000, rate: 0.23 },
  { upTo: null, rate: 0.25 },
];

export const pitFromBands = (chargeable: number): number => {
  let tax = 0;
  let previous = 0;
  for (const band of PIT_2026_BANDS) {
    const cap = band.upTo ?? Infinity;
    const slice = Math.min(chargeable, cap) - previous;
    if (slice > 0) tax += slice * band.rate;
    if (chargeable <= cap) break;
    previous = cap;
  }
  return Math.round(tax);
};

/** VAT amount from a gross figure per basis (7.5%; inclusive default). */
const vatOf = (amount: number, basis: "inclusive" | "exclusive"): number =>
  basis === "inclusive" ? (amount * 7.5) / 107.5 : amount * 0.075;

/** Is the period fully in the past relative to the mock clock? */
export const periodComplete = (period: string): boolean => {
  const today = mockNow();
  const month = period.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    const end = new Date(Number(month[1]), Number(month[2]), 0, 23, 59, 59);
    return end.getTime() < today.getTime();
  }
  const quarter = period.match(/^(\d{4})-Q([1-4])$/);
  if (quarter) {
    const end = new Date(Number(quarter[1]), Number(quarter[2]) * 3, 0);
    return end.getTime() < today.getTime();
  }
  const half = period.match(/^(\d{4})-H([12])$/);
  if (half) {
    const end = new Date(Number(half[1]), half[2] === "1" ? 6 : 12, 0);
    return end.getTime() < today.getTime();
  }
  const fy = period.match(/^(?:FY)?(\d{4})$/);
  if (fy) {
    const end = new Date(Number(fy[1]), 12, 0);
    return end.getTime() < today.getTime();
  }
  return false;
};

const monthTxns = (db: MockDb, orgId: string, month: string) =>
  db.transactions.filter(
    (txn) => txn.org_id === orgId && txn.txn_date.startsWith(month),
  );

/** VAT estimate for a month (tax-engine.md §4). */
export const computeVatEstimate = (
  db: MockDb,
  profile: TaxProfile,
  month: string,
): TaxEstimate => {
  const categories = new Map(
    db.categories
      .filter((cat) => cat.org_id === profile.org_id)
      .map((cat) => [cat.id, cat]),
  );
  let output = 0;
  let input = 0;
  const outputIds: string[] = [];
  const inputIds: string[] = [];
  for (const txn of monthTxns(db, profile.org_id, month)) {
    const category = categories.get(txn.category_id);
    if (!category || category.vat_treatment !== "vatable") continue;
    const vat = vatOf(txn.amount, category.vat_basis);
    if (txn.direction === "income") {
      output += vat;
      outputIds.push(txn.id);
    } else {
      input += vat;
      inputIds.push(txn.id);
    }
  }
  // Input-VAT recovery [Decided v1]: fully recoverable when all supplies
  // are vatable/zero-rated (the seed's income categories all are).
  const hasExemptSupplies = db.categories.some(
    (cat) =>
      cat.org_id === profile.org_id &&
      cat.type === "income" &&
      cat.vat_treatment === "exempt",
  );
  const recoveryNote = hasExemptSupplies
    ? "pro-rata apportionment by vatable-revenue share"
    : "fully recoverable — all supplies vatable/zero-rated";

  const outputRounded = Math.round(output);
  const inputRounded = Math.round(input);
  const net = outputRounded - inputRounded;

  const [year, monthNum] = month.split("-").map(Number);
  const due = new Date(year, monthNum, 21); // 21st of the following month
  const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-21`;

  const fields: ComputedField[] = [
    {
      key: "output_vat",
      label: "Output VAT",
      value: outputRounded,
      formula: "Σ vatable income × 7.5/107.5 (inclusive basis)",
      inputs: outputIds,
      notes: ["ledger amounts are VAT-inclusive by default"],
    },
    {
      key: "input_vat",
      label: "Recoverable input VAT",
      value: inputRounded,
      formula: "Σ vatable expenses × 7.5/107.5 (inclusive basis)",
      inputs: inputIds,
      notes: [recoveryNote],
    },
    {
      key: "net_vat",
      label: "Net VAT position",
      value: net,
      formula: "output − recoverable input",
      inputs: [],
      notes: [],
    },
  ];

  return {
    id: nextId("estimate"),
    profile_id: profile.id,
    org_id: profile.org_id,
    kind: "vat",
    period: month,
    amount_due: net,
    due_date: dueDate,
    computed_fields: fields,
    authority: resolveAuthority("vat", profile.taxpayer_kind, null),
    ruleset_id: resolveRuleset("vat", month),
    banners: [],
    computed_at: mockNow().toISOString(),
  };
};

/** CIT estimate (tax-engine.md §3) from mapped statement line items. */
export const computeCitEstimate = (
  db: MockDb,
  profile: TaxProfile,
  period: string,
  basisPeriod: string,
): TaxEstimate => {
  const value = (key: string): { amount: number; id: string } | null => {
    for (const statement of db.statements) {
      if (
        statement.org_id !== profile.org_id ||
        statement.period !== basisPeriod ||
        statement.mapping_status !== "confirmed"
      ) {
        continue;
      }
      const item = db.lineItems.find(
        (li) =>
          li.statement_id === statement.id &&
          li.canonical_key === key &&
          li.status === "mapped",
      );
      if (item) return { amount: item.amount, id: item.id };
    }
    return null;
  };

  const netIncome = value("net_income");
  const dAndA = value("depreciation_amortization");
  const revenue = value("revenue");
  const ppe = value("ppe");
  const intangibles = value("intangibles");

  const assessable = (netIncome?.amount ?? 0) + (dAndA?.amount ?? 0);
  const turnover = revenue?.amount ?? 0;
  const fixedAssets = (ppe?.amount ?? 0) + (intangibles?.amount ?? 0);
  const isSmall = turnover <= 100_000_000 && fixedAssets <= 250_000_000;
  const citRate = isSmall ? 0 : 0.3;
  const levyRate = isSmall ? 0 : 0.04; // levy follows the CIT exemption
  const cit = Math.round(assessable * citRate);
  const levy = Math.round(assessable * levyRate);

  const banners: string[] = [];
  if (period !== basisPeriod) {
    banners.push(
      `${period} statements not yet uploaded — estimate based on ${basisPeriod} results`,
    );
  }
  const borderline =
    Math.abs(turnover - 100_000_000) / 100_000_000 <= 0.1 ||
    Math.abs(fixedAssets - 250_000_000) / 250_000_000 <= 0.1;
  if (borderline) {
    banners.push("Borderline small-company classification — review inputs");
  }

  const fields: ComputedField[] = [
    {
      key: "assessable_profit",
      label: "Assessable profit",
      value: assessable,
      formula: "net_income + adjustments (depreciation add-back)",
      inputs: [netIncome?.id, dAndA?.id].filter((id): id is string => !!id),
      notes: [
        "v1 exposes the adjustments worksheet with editable lines rather than computing capital allowances",
      ],
    },
    {
      key: "classification",
      label: "Classification",
      value: isSmall ? 0 : 1,
      formula: "small company: turnover ≤ ₦100m AND fixed assets ≤ ₦250m",
      inputs: [revenue?.id, ppe?.id, intangibles?.id].filter(
        (id): id is string => !!id,
      ),
      notes: [
        isSmall
          ? "small company — 0% CIT and 0% development levy"
          : `other — 30% CIT + 4% development levy (turnover ₦${(turnover / 1_000_000).toFixed(1)}m)`,
      ],
    },
    {
      key: "cit",
      label: "Company income tax",
      value: cit,
      formula: `assessable_profit × ${citRate}`,
      inputs: [],
      notes: [],
    },
    {
      key: "development_levy",
      label: "Development levy",
      value: levy,
      formula: `assessable_profit × ${levyRate}`,
      inputs: [],
      notes: ["consolidates the former education tax"],
    },
  ];

  // cit due: within 6 months of the accounting year end (fy_end+6m).
  const org = db.orgs.find((item) => item.id === profile.org_id);
  const fyYear = Number(period.replace("FY", ""));
  const [fyMonth] = (org?.fiscal_year_end ?? "12-31").split("-").map(Number);
  const due = new Date(fyYear, fyMonth - 1 + 7, 0); // end month + 6m, end of month approximation
  const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-30`;

  return {
    id: nextId("estimate"),
    profile_id: profile.id,
    org_id: profile.org_id,
    kind: "cit",
    period,
    amount_due: cit + levy,
    due_date: dueDate,
    computed_fields: fields,
    authority: resolveAuthority("cit", profile.taxpayer_kind, null),
    ruleset_id: resolveRuleset("cit", period),
    banners,
    computed_at: mockNow().toISOString(),
  };
};

/** PIT estimate, ng-pit-2026 (tax-engine.md §2) — gross-income basis. */
export const computePitEstimate = (
  db: MockDb,
  profile: TaxProfile,
  year: string,
): TaxEstimate => {
  const categories = new Map(
    db.categories
      .filter((cat) => cat.org_id === profile.org_id)
      .map((cat) => [cat.id, cat]),
  );
  let gross = 0;
  const inputs: string[] = [];
  let exemptTotal = 0;
  for (const txn of db.transactions) {
    if (
      txn.org_id !== profile.org_id ||
      txn.direction !== "income" ||
      !txn.txn_date.startsWith(year)
    ) {
      continue;
    }
    const treatment =
      profile.category_treatments[txn.category_id]?.tax_treatment ??
      categories.get(txn.category_id)?.tax_treatment ??
      "taxable_income";
    if (treatment === "taxable_income") {
      gross += txn.amount;
      inputs.push(txn.id);
    } else if (treatment === "exempt") {
      exemptTotal += txn.amount; // reported in the trace, excluded from tax
    }
    // "ignore" — not income at all: excluded from gross and the trace.
  }

  const deductions = 0; // absent inputs default to 0 with an "add deductions" prompt
  const rentRelief = 0; // rent user-supplied; absent → 0 with prompt
  const chargeable = Math.max(0, gross - deductions - rentRelief);
  const tax = pitFromBands(chargeable);

  const fields: ComputedField[] = [
    {
      key: "gross_income",
      label: "Gross income",
      value: gross,
      formula: "Σ income transactions (taxable categories)",
      inputs,
      notes:
        exemptTotal > 0
          ? [`exempt income excluded: ₦${exemptTotal.toLocaleString()}`]
          : [],
    },
    {
      key: "deductions",
      label: "Allowed deductions",
      value: deductions,
      formula: "pension + NHF + NHIS + life assurance",
      inputs: [],
      notes: ["no deduction inputs yet — add deductions"],
    },
    {
      key: "rent_relief",
      label: "Rent relief",
      value: rentRelief,
      formula: "20% of annual rent, capped ₦500,000",
      inputs: [],
      notes: ["annual rent not supplied — add rent to claim relief"],
    },
    {
      key: "pit",
      label: "Personal income tax",
      value: tax,
      formula: "NTA 2025 bands over chargeable income",
      inputs: [],
      notes: [],
    },
  ];

  return {
    id: nextId("estimate"),
    profile_id: profile.id,
    org_id: profile.org_id,
    kind: "pit",
    period: year,
    amount_due: tax,
    due_date: `${Number(year) + 1}-03-31`,
    computed_fields: fields,
    authority: resolveAuthority(
      "pit",
      profile.taxpayer_kind,
      profile.state_of_residence,
    ),
    ruleset_id: resolveRuleset("pit", year),
    banners: [
      "PIT shown before business-expense deductions — consult your accountant",
      `Estimate covers ${year} year-to-date income`,
    ],
    computed_at: mockNow().toISOString(),
  };
};

/** All current estimates for an org (GET /tax/estimates). */
export const computeEstimates = (orgId: string): TaxEstimate[] => {
  const db = getDb();
  const profile = db.taxProfiles.find((item) => item.org_id === orgId);
  if (!profile) return [];
  if (profile.taxpayer_kind === "company") {
    return [
      computeVatEstimate(db, profile, "2026-06"),
      computeCitEstimate(db, profile, "FY2026", "FY2025"),
    ];
  }
  return [computePitEstimate(db, profile, "2026")];
};

/** Tax-identity completeness (tax-engine.md §5). */
export const identityIncomplete = (profile: TaxProfile): string[] => {
  const missing: string[] = [];
  if (!profile.tin) missing.push("tin");
  if (profile.taxpayer_kind === "company") {
    const db = getDb();
    const org = db.orgs.find((item) => item.id === profile.org_id);
    if (!profile.rc_number) missing.push("rc_number");
    if (!org?.registered_address) missing.push("registered_address");
  } else if (!profile.state_of_residence) {
    missing.push("state_of_residence");
  }
  return missing;
};
