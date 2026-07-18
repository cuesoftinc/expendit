/**
 * Mock: reports — generate (201 artifact, 30-day TTL, signed URL) and
 * TTL'd history (api.md §2; MI-14).
 */

import type { ReportArtifact, ReportKind } from "@/models";
import { PERIOD_PATTERN } from "@/models/registry/line-items";
import { getDb, nextId } from "@/mock/db";
import { mockNow } from "@/mock/clock";
import { fail, ok, resolveOrgId, writeBlocked } from "@/mock/http";

const KINDS: ReportKind[] = [
  "monthly_summary",
  "cash_movement",
  "category_deep_dive",
  "financial_statement",
];

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const now = mockNow().toISOString();
  const items = getDb()
    .artifacts.filter((artifact) => artifact.org_id === orgId)
    .map((artifact) =>
      artifact.expires_at < now && artifact.status === "ready"
        ? { ...artifact, status: "expired" as const, signed_url: null }
        : artifact,
    )
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return ok({ items });
}

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();
  const body = (await request.json()) as {
    kind?: ReportKind;
    period?: string;
    format?: "pdf" | "csv";
    category?: string;
    statement_kind?: ReportArtifact["params"]["statement_kind"];
  };

  if (!body.kind || !KINDS.includes(body.kind)) {
    return fail(422, "validation_failed", "kind is required", {
      allowed: KINDS,
    });
  }
  if (!body.period || !body.format) {
    return fail(422, "validation_failed", "period and format are required");
  }
  if (body.kind === "category_deep_dive" && !body.category) {
    return fail(
      422,
      "validation_failed",
      "category is required for category_deep_dive",
    );
  }
  if (body.kind === "financial_statement") {
    if (!body.statement_kind) {
      return fail(
        422,
        "validation_failed",
        "statement_kind is required for financial_statement",
      );
    }
    if (!PERIOD_PATTERN.test(body.period)) {
      return fail(
        422,
        "validation_failed",
        "financial_statement uses the statement period grammar (line-items.md §6)",
      );
    }
  }

  const now = mockNow();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 30); // 30-day artifact TTL

  const artifact: ReportArtifact = {
    id: nextId("artifact"),
    org_id: orgId,
    kind: body.kind,
    format: body.format,
    period: body.period,
    params: {
      ...(body.category ? { category: body.category } : {}),
      ...(body.statement_kind ? { statement_kind: body.statement_kind } : {}),
    },
    status: "ready",
    signed_url: `/api/mock/reports/${nextId("dl")}/download`,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };
  db.artifacts.unshift(artifact);
  return ok(artifact, 201);
}
