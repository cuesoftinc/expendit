import { describe, expect, it } from "vitest";
import { missingTaxIdentifiers } from "@/models/tax";

describe("tax identity (tax-engine.md §5)", () => {
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
