// @vitest-environment node

import { missingTaxIdentifiers } from "@/models/tax";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDb } from "./store";
import {
  computeEstimates,
  identityIncomplete,
  pitFromBands,
  resolveRuleset,
} from "./tax-engine";
import { ORG_CUESOFT, ORG_PERSONAL } from "./seed";

describe("tax engine (tax-engine.md)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("VAT 2026-06: output 636,000 − input 85,400 = ₦550,600, FIRS, due 21 Jul", () => {
    const estimates = computeEstimates(ORG_CUESOFT);
    const vat = estimates.find((estimate) => estimate.kind === "vat");
    expect(vat).toBeDefined();
    expect(vat?.period).toBe("2026-06");
    const field = (key: string) =>
      vat?.computed_fields.find((item) => item.key === key)?.value;
    expect(field("output_vat")).toBe(636_000);
    expect(field("input_vat")).toBe(85_400);
    expect(vat?.amount_due).toBe(550_600);
    expect(vat?.due_date).toBe("2026-07-21"); // T-1 from the mock "today"
    expect(vat?.authority.code).toBe("FIRS");
    expect(vat?.ruleset_id).toBe("ng-vat-2026");
  });

  it("CIT FY2026 estimate: 30% + 4% levy on assessable ₦16.1m (FIRS)", () => {
    const estimates = computeEstimates(ORG_CUESOFT);
    const cit = estimates.find((estimate) => estimate.kind === "cit");
    const field = (key: string) =>
      cit?.computed_fields.find((item) => item.key === key)?.value;
    expect(field("assessable_profit")).toBe(16_100_000);
    expect(field("cit")).toBe(4_830_000);
    expect(field("development_levy")).toBe(644_000);
    expect(cit?.amount_due).toBe(5_474_000);
    expect(cit?.authority.code).toBe("FIRS");
    expect(
      cit?.banners.some((banner) => banner.includes("FY2025 results")),
    ).toBe(true);
  });

  it("PIT 2026 (personal org): ₦762,000 on ₦5.4m gross → LIRS", () => {
    const estimates = computeEstimates(ORG_PERSONAL);
    expect(estimates).toHaveLength(1);
    const pit = estimates[0];
    expect(pit.kind).toBe("pit");
    expect(pit.amount_due).toBe(762_000);
    expect(pit.authority.code).toBe("LIRS"); // NG-LA → Lagos State IRS
    expect(pit.due_date).toBe("2027-03-31");
    expect(
      pit.banners.some((banner) =>
        banner.includes("before business-expense deductions"),
      ),
    ).toBe(true);
  });

  it("PIT-2026 golden band edges (tax-engine.md §6)", () => {
    expect(pitFromBands(800_000)).toBe(0); // 0 tax at ≤800k
    expect(pitFromBands(3_000_000)).toBe(330_000); // 2.2m × 15%
    expect(pitFromBands(12_000_000)).toBe(330_000 + 9_000_000 * 0.18);
    expect(pitFromBands(25_000_000)).toBe(
      330_000 + 1_620_000 + 13_000_000 * 0.21,
    );
    expect(pitFromBands(50_000_000)).toBe(
      330_000 + 1_620_000 + 2_730_000 + 25_000_000 * 0.23,
    );
  });

  it("resolves rule sets by period start date", () => {
    expect(resolveRuleset("pit", "2025")).toBe("ng-pit-legacy");
    expect(resolveRuleset("pit", "2026")).toBe("ng-pit-2026");
    expect(resolveRuleset("cit", "FY2025")).toBe("ng-cit-legacy");
    expect(resolveRuleset("cit", "FY2026")).toBe("ng-cit-2026");
  });

  it("flags incomplete tax identity per taxpayer kind", () => {
    const db = getDb();
    const personal = db.taxProfiles.find((p) => p.org_id === ORG_PERSONAL);
    expect(identityIncomplete(personal!)).toEqual(["tin"]);
    const company = db.taxProfiles.find((p) => p.org_id === ORG_CUESOFT);
    expect(identityIncomplete(company!)).toEqual([]);
  });

  it("missingTaxIdentifiers: one predicate for both taxpayer kinds (wizard gate == generate endpoint)", () => {
    // Company: TIN present but RC + registered address missing → both named.
    expect(
      missingTaxIdentifiers(
        {
          taxpayer_kind: "company",
          tin: "TIN-1",
          rc_number: null,
          state_of_residence: null,
        },
        { registered_address: undefined },
      ),
    ).toEqual(["rc_number", "registered_address"]);
    // Company complete.
    expect(
      missingTaxIdentifiers(
        {
          taxpayer_kind: "company",
          tin: "TIN-1",
          rc_number: "RC-1",
          state_of_residence: null,
        },
        { registered_address: { line1: "1 Road" } },
      ),
    ).toEqual([]);
    // Individual: no RC requirement, state of residence required.
    expect(
      missingTaxIdentifiers({
        taxpayer_kind: "individual",
        tin: null,
        rc_number: null,
        state_of_residence: null,
      }),
    ).toEqual(["tin", "state_of_residence"]);
    expect(
      missingTaxIdentifiers({
        taxpayer_kind: "individual",
        tin: "TIN-2",
        rc_number: null,
        state_of_residence: "NG-LA",
      }),
    ).toEqual([]);
  });
});
