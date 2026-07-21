/**
 * Mock: filings — history (GET) and wizard draft creation (POST, gated by
 * 422 period_incomplete) — tax-engine.md §5.
 */

import type { TaxFiling, TaxKind } from "@/models";
import { getDb, nextId } from "@/mocks/db";
import { mockNow } from "@/mocks/clock";
import {
  computeCitEstimate,
  computePitEstimate,
  computeVatEstimate,
  periodComplete,
} from "@/mocks/tax-engine";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mocks/http";

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const items = getDb()
    .taxFilings.filter((filing) => filing.org_id === orgId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return ok({ items });
}

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const profile = db.taxProfiles.find((item) => item.org_id === orgId);
  if (!profile) return notFound();

  const body = (await request.json()) as { kind?: TaxKind; period?: string };
  if (!body.kind || !body.period) {
    return fail(422, "validation_failed", "kind and period are required");
  }
  if (!periodComplete(body.period)) {
    return fail(
      422,
      "period_incomplete",
      `${body.period} has not ended — filings need full-period data`,
    );
  }

  // Draft figures reuse the estimate engines against the drafted period.
  const estimate =
    body.kind === "vat"
      ? computeVatEstimate(db, profile, body.period)
      : body.kind === "cit"
        ? computeCitEstimate(db, profile, body.period, body.period)
        : computePitEstimate(db, profile, body.period);

  const filing: TaxFiling = {
    id: nextId("filing"),
    org_id: orgId,
    kind: body.kind,
    period: body.period,
    status: "draft",
    amount_due: estimate.amount_due,
    due_date: estimate.due_date,
    computed_fields: estimate.computed_fields,
    authority: estimate.authority, // persisted — survives registry changes
    artifact_key: null,
    filed_at: null,
    created_at: mockNow().toISOString(),
  };
  db.taxFilings.unshift(filing);
  return ok(filing, 201);
}
