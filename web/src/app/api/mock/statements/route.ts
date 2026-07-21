/**
 * Mock: statements — list; multipart upload → 202 processing; manual JSON
 * entry → 201 staged directly (flows/statement-mapping.md §1–2).
 */

import type { FinStatement, ManualStatementEntry } from "@/models";
import {
  isCanonicalKey,
  CANONICAL_KEY_LABELS,
  PERIOD_PATTERN,
} from "@/models/registry/line-items";
import { getDb, nextId } from "@/mocks/db";
import { mockNow } from "@/mocks/clock";
import { fail, ok, resolveOrgId, writeBlocked } from "@/mocks/http";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXT = new Set([
  "csv",
  "xlsx",
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "heic",
]);

export async function GET(request: Request) {
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const items = getDb()
    .statements.filter((statement) => statement.org_id === orgId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return ok({ items });
}

const validatePeriod = (kind: string, period: string): string | null => {
  if (!PERIOD_PATTERN.test(period)) {
    if (/^\d{4}-\d{2}$/.test(period)) {
      return "Monthly statements are not accepted in v1 — aggregate to a quarter";
    }
    return "Period must match the closed grammar: YYYY-Qn | YYYY-H1/H2 | FYYYYY";
  }
  if (!["balance_sheet", "income_statement", "cash_flow"].includes(kind)) {
    return "kind must be balance_sheet | income_statement | cash_flow";
  }
  return null;
};

export async function POST(request: Request) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const orgId = resolveOrgId(request);
  if (!orgId) return fail(404, "not_found", "Unknown org");
  const db = getDb();
  const org = db.orgs.find((item) => item.id === orgId);
  const contentType = request.headers.get("content-type") ?? "";

  // ---- Manual JSON entry → 201 staged directly ------------------------
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as ManualStatementEntry;
    const periodError = validatePeriod(body.kind, body.period ?? "");
    if (periodError) return fail(422, "validation_failed", periodError);
    if (org && body.currency && body.currency !== org.currency) {
      return fail(
        422,
        "currency_mismatch",
        `Statement currency ${body.currency} does not match the org currency ${org.currency} — no FX in v1`,
      );
    }
    if (!Array.isArray(body.line_items) || body.line_items.length === 0) {
      return fail(422, "validation_failed", "line_items are required");
    }
    for (const row of body.line_items) {
      if (!isCanonicalKey(row.canonical_key)) {
        return fail(
          422,
          "validation_failed",
          `Unknown canonical key: ${row.canonical_key} — the vocabulary is closed`,
        );
      }
    }
    const duplicate = db.statements.find(
      (statement) =>
        statement.org_id === orgId &&
        statement.kind === body.kind &&
        statement.period === body.period &&
        statement.mapping_status === "confirmed",
    );
    if (duplicate) {
      return fail(
        409,
        "period_exists",
        `A confirmed ${body.kind} for ${body.period} exists — confirming this one will supersede it`,
        { existing_statement_id: duplicate.id },
      );
    }

    const statement: FinStatement = {
      id: nextId("stmt"),
      org_id: orgId,
      kind: body.kind,
      period: body.period,
      currency: body.currency ?? org?.currency ?? "NGN",
      source_file_type: "manual",
      mapping_status: "staged", // no parse, no AI call
      superseded_by: null,
      mapping_warnings: [],
      created_at: mockNow().toISOString(),
      confirmed_at: null,
    };
    db.statements.push(statement);
    for (const row of body.line_items) {
      db.lineItems.push({
        id: nextId(`${statement.id}-li`),
        statement_id: statement.id,
        canonical_key: row.canonical_key,
        source_label: row.label ?? CANONICAL_KEY_LABELS[row.canonical_key],
        amount: row.amount,
        status: "mapped",
        confidence: null,
        mapped_by: "user",
        derived: false,
      });
    }
    return ok(
      { statement_id: statement.id, mapping_status: statement.mapping_status },
      201,
    );
  }

  // ---- Multipart upload → 202 processing -------------------------------
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey && db.idempotency[idempotencyKey]) {
    const existing = db.statements.find(
      (statement) => statement.id === db.idempotency[idempotencyKey],
    );
    if (existing && existing.mapping_status !== "failed") {
      return ok(
        {
          statement_id: existing.id,
          mapping_status: existing.mapping_status,
        },
        202,
      );
    }
    delete db.idempotency[idempotencyKey];
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const period = String(form.get("period") ?? "");
  if (!(file instanceof File)) {
    return fail(422, "validation_failed", "No file in upload");
  }
  if (file.size > MAX_BYTES) {
    return fail(413, "file_too_large", "Files must be 15 MB or smaller");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    return fail(
      415,
      "unsupported_type",
      "Upload a CSV, XLSX, PDF, or scanned statement image",
    );
  }
  const periodError = validatePeriod(kind, period);
  if (periodError) return fail(422, "validation_failed", periodError);

  const duplicate = db.statements.find(
    (statement) =>
      statement.org_id === orgId &&
      statement.kind === kind &&
      statement.period === period &&
      statement.mapping_status === "confirmed",
  );
  if (duplicate) {
    return fail(
      409,
      "period_exists",
      `A confirmed ${kind} for ${period} exists — offer supersede`,
      { existing_statement_id: duplicate.id },
    );
  }

  const statement: FinStatement = {
    id: nextId("stmt"),
    org_id: orgId,
    kind: kind as FinStatement["kind"],
    period,
    currency: org?.currency ?? "NGN",
    source_file_type:
      ext === "pdf"
        ? "pdf"
        : ext === "xlsx"
          ? "xlsx"
          : ext === "csv"
            ? "csv"
            : "image",
    mapping_status: "processing",
    superseded_by: null,
    mapping_warnings: [],
    created_at: mockNow().toISOString(),
    confirmed_at: null,
  };
  db.statements.push(statement);
  db.processingSince[statement.id] = Date.now();
  if (idempotencyKey) db.idempotency[idempotencyKey] = statement.id;

  return ok({ statement_id: statement.id, mapping_status: "processing" }, 202);
}
