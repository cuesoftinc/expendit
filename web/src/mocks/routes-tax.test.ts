// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { GET as getEstimates } from "@/app/api/mock/tax/estimates/route";
import { PUT as putProfile } from "@/app/api/mock/tax/profile/route";
import { POST as createFiling } from "@/app/api/mock/tax/filings/route";
import { POST as generateFiling } from "@/app/api/mock/tax/filings/[id]/generate/route";
import type { TaxEstimate, TaxFiling } from "@/models";
import { resetDb } from "./db";
import { ORG_PERSONAL } from "./seed";
import { json, mockRequest, params } from "./test-helpers";

describe("mock tax routes (tax-engine.md §5/§5.5 gates)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("estimates carry resolved authorities (FIRS company / LIRS personal)", async () => {
    const company = await json<{ items: TaxEstimate[] }>(
      await getEstimates(mockRequest("/api/mock/tax/estimates")),
    );
    // June (complete, due 21 Jul) + July (in progress, due 21 Aug) + CIT.
    expect(company.items.map((estimate) => estimate.kind).sort()).toEqual([
      "cit",
      "vat",
      "vat",
    ]);
    expect(
      company.items.every((estimate) => estimate.authority.code === "FIRS"),
    ).toBe(true);
    const julyVat = company.items.find(
      (estimate) => estimate.kind === "vat" && estimate.period === "2026-07",
    );
    expect(julyVat?.due_date).toBe("2026-08-21");
    expect(julyVat?.banners[0]).toContain("in progress");

    const personal = await json<{ items: TaxEstimate[] }>(
      await getEstimates(
        mockRequest("/api/mock/tax/estimates", { orgId: ORG_PERSONAL }),
      ),
    );
    expect(personal.items[0]?.authority.code).toBe("LIRS");
    expect(personal.items[0]?.authority.payment_channels).toContain(
      "LIRS eTax portal",
    );
  });

  it("draft creation gates on complete periods (422 period_incomplete)", async () => {
    const incomplete = await createFiling(
      mockRequest("/api/mock/tax/filings", {
        method: "POST",
        body: { kind: "vat", period: "2026-07" },
      }),
    );
    expect(incomplete.status).toBe(422);
    const body = await json<{ error: { code: string } }>(incomplete);
    expect(body.error.code).toBe("period_incomplete");

    const complete = await createFiling(
      mockRequest("/api/mock/tax/filings", {
        method: "POST",
        body: { kind: "vat", period: "2026-06" },
      }),
    );
    expect(complete.status).toBe(201);
    const filing = await json<TaxFiling>(complete);
    expect(filing.amount_due).toBe(550_600);
    expect(filing.status).toBe("draft");
  });

  it("generate succeeds for VAT with complete identity, adds the remittance sheet", async () => {
    const filing = await json<TaxFiling>(
      await createFiling(
        mockRequest("/api/mock/tax/filings", {
          method: "POST",
          body: { kind: "vat", period: "2026-06" },
        }),
      ),
    );
    const response = await generateFiling(
      mockRequest(`/api/mock/tax/filings/${filing.id}/generate`, {
        method: "POST",
      }),
      params({ id: filing.id }),
    );
    expect(response.status).toBe(201);
    const generated = await json<TaxFiling>(response);
    expect(generated.status).toBe("generated");
    const sheet = generated.computed_fields.find(
      (field) => field.key === "remittance_sheet",
    );
    expect(sheet).toBeDefined();
    expect(sheet?.notes[0]).toContain("FIRS");
    expect(sheet?.notes[0]).toContain("2026-07-21");
  });

  it("CIT generate blocks on staged statements (422 mapping_unconfirmed)", async () => {
    const filing = await json<TaxFiling>(
      await createFiling(
        mockRequest("/api/mock/tax/filings", {
          method: "POST",
          body: { kind: "cit", period: "FY2025" },
        }),
      ),
    );
    const response = await generateFiling(
      mockRequest(`/api/mock/tax/filings/${filing.id}/generate`, {
        method: "POST",
      }),
      params({ id: filing.id }),
    );
    expect(response.status).toBe(422);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("mapping_unconfirmed"); // stmt-bs-2026q2 staged
  });

  it("unsigned rule set blocks generation (409 ruleset_unsigned)", async () => {
    const filing = await json<TaxFiling>(
      await createFiling(
        mockRequest("/api/mock/tax/filings", {
          method: "POST",
          body: { kind: "pit", period: "2025" },
        }),
        // company org context, but PIT resolution still hits ng-pit-legacy
      ),
    );
    const response = await generateFiling(
      mockRequest(`/api/mock/tax/filings/${filing.id}/generate`, {
        method: "POST",
      }),
      params({ id: filing.id }),
    );
    expect(response.status).toBe(409);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("ruleset_unsigned");
  });

  it("incomplete tax identity blocks generation (422 tax_identity_incomplete)", async () => {
    // Drop the TIN from the company profile, then try VAT generation.
    await putProfile(
      mockRequest("/api/mock/tax/profile", {
        method: "PUT",
        body: { tin: null },
      }),
    );
    const filing = await json<TaxFiling>(
      await createFiling(
        mockRequest("/api/mock/tax/filings", {
          method: "POST",
          body: { kind: "vat", period: "2026-06" },
        }),
      ),
    );
    const response = await generateFiling(
      mockRequest(`/api/mock/tax/filings/${filing.id}/generate`, {
        method: "POST",
      }),
      params({ id: filing.id }),
    );
    expect(response.status).toBe(422);
    const body = await json<{
      error: { code: string; details: { missing: string[] } };
    }>(response);
    expect(body.error.code).toBe("tax_identity_incomplete");
    expect(body.error.details.missing).toContain("tin");
  });
});
