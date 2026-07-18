/**
 * Mock: filing document generation — the wizard gates in order
 * (tax-engine.md §5): 409 ruleset_unsigned → 422 mapping_unconfirmed
 * (CIT with staged statements) → 422 tax_identity_incomplete; success
 * generates artifacts incl. the remittance sheet (§5.5).
 */

import { getDb } from "@/mock/db";
import {
  identityIncomplete,
  resolveRuleset,
  RULESETS,
} from "@/mock/tax-engine";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const filing = db.taxFilings.find(
    (item) => item.id === id && item.org_id === orgId,
  );
  if (!filing) return notFound();
  if (filing.status !== "draft") {
    return fail(
      409,
      "filing_not_draft",
      `Filing is ${filing.status} — documents are immutable once generated`,
    );
  }

  const rulesetId = resolveRuleset(filing.kind, filing.period);
  if (!RULESETS[rulesetId]?.signed) {
    return fail(
      409,
      "ruleset_unsigned",
      `Rule set ${rulesetId} has no professional sign-off — filings stay estimates`,
    );
  }

  if (filing.kind === "cit") {
    const staged = db.statements.some(
      (statement) =>
        statement.org_id === orgId && statement.mapping_status === "staged",
    );
    if (staged) {
      return fail(
        422,
        "mapping_unconfirmed",
        "Confirm all staged statement mappings before generating a CIT filing",
      );
    }
  }

  const profile = db.taxProfiles.find((item) => item.org_id === orgId);
  const missing = profile ? identityIncomplete(profile) : ["tin"];
  if (missing.length > 0) {
    return fail(
      422,
      "tax_identity_incomplete",
      "Complete your tax profile before generating filing documents",
      { missing },
    );
  }

  filing.status = "generated";
  filing.artifact_key = `filings/${filing.kind}-${filing.period.toLowerCase()}-${orgId}.zip`;
  filing.filed_at = null;
  filing.computed_fields = [
    ...filing.computed_fields,
    {
      key: "remittance_sheet",
      label: "Remittance sheet",
      value: filing.amount_due,
      formula: "authority + amount due + period + deadline + channels + TIN/RC",
      inputs: [],
      notes: [
        `Remit to ${filing.authority.name} (${filing.authority.code}) via ${filing.authority.payment_channels.join(" / ")} by ${filing.due_date}`,
      ],
    },
  ];
  return ok(filing, 201);
}
