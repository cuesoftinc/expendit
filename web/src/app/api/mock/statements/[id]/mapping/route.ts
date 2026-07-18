/**
 * Mock: mapping review — poll (GET, processing → staged after ~1.2s with
 * AI-suggested rows; <0.6 confidence arrives unmapped) and fix/add/park
 * (PATCH) — flows/statement-mapping.md §2.
 */

import type { FinStatement, LineItem } from "@/models";
import {
  isCanonicalKey,
  SUGGESTION_CONFIDENCE_FLOOR,
} from "@/models/registry/line-items";
import { getDb, nextId } from "@/mock/db";
import { fail, notFound, ok, resolveOrgId, writeBlocked } from "@/mock/http";

type Context = { params: Promise<{ id: string }> };

const PROCESSING_MS = 1200;

/** Deterministic parse result for uploaded statements. */
const suggestRows = (statement: FinStatement): LineItem[] => {
  const rows: Array<{
    key: string | null;
    label: string;
    amount: number;
    confidence: number;
  }> =
    statement.kind === "income_statement"
      ? [
          {
            key: "revenue",
            label: "Turnover",
            amount: 74_000_000,
            confidence: 0.97,
          },
          {
            key: "cogs",
            label: "Cost of sales",
            amount: 36_100_000,
            confidence: 0.94,
          },
          {
            key: "opex",
            label: "Admin expenses",
            amount: 24_500_000,
            confidence: 0.9,
          },
          {
            key: null,
            label: "Sundry charges",
            amount: 1_200_000,
            confidence: 0.42,
          },
        ]
      : statement.kind === "cash_flow"
        ? [
            {
              key: "cfo",
              label: "Net cash from operations",
              amount: 9_400_000,
              confidence: 0.95,
            },
            {
              key: "cfi",
              label: "Net cash used in investing",
              amount: -3_100_000,
              confidence: 0.9,
            },
            {
              key: "cff",
              label: "Net cash from financing",
              amount: -1_500_000,
              confidence: 0.88,
            },
            {
              key: "capex",
              label: "Purchase of equipment",
              amount: -2_800_000,
              confidence: 0.86,
            },
          ]
        : [
            {
              key: "cash_and_equivalents",
              label: "Cash at bank",
              amount: 16_800_000,
              confidence: 0.96,
            },
            {
              key: "receivables",
              label: "Trade debtors",
              amount: 7_100_000,
              confidence: 0.92,
            },
            {
              key: "payables",
              label: "Trade creditors",
              amount: 5_900_000,
              confidence: 0.9,
            },
            {
              key: null,
              label: "Sundry balances",
              amount: 700_000,
              confidence: 0.38,
            },
          ];

  return rows.map((row) => ({
    id: nextId(`${statement.id}-li`),
    statement_id: statement.id,
    // Rows under the confidence floor arrive unmapped, never guessed.
    canonical_key:
      row.key &&
      row.confidence >= SUGGESTION_CONFIDENCE_FLOOR &&
      isCanonicalKey(row.key)
        ? row.key
        : null,
    source_label: row.label,
    amount: row.amount,
    status:
      row.key && row.confidence >= SUGGESTION_CONFIDENCE_FLOOR
        ? "mapped"
        : "unmapped",
    confidence: row.confidence,
    mapped_by: "ai",
    derived: false,
  }));
};

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const statement = db.statements.find(
    (item) => item.id === id && item.org_id === orgId,
  );
  if (!statement) return notFound();

  const since = db.processingSince[statement.id];
  if (statement.mapping_status === "processing" && since !== undefined) {
    if (Date.now() - since >= PROCESSING_MS) {
      delete db.processingSince[statement.id];
      db.lineItems.push(...suggestRows(statement));
      statement.mapping_status = "staged";
    }
  }

  const lineItems = db.lineItems.filter(
    (item) => item.statement_id === statement.id,
  );
  return ok({ statement, line_items: lineItems });
}

export async function PATCH(request: Request, context: Context) {
  const blocked = writeBlocked();
  if (blocked) return blocked;
  const { id } = await context.params;
  const orgId = resolveOrgId(request);
  if (!orgId) return notFound();
  const db = getDb();
  const statement = db.statements.find(
    (item) => item.id === id && item.org_id === orgId,
  );
  if (!statement) return notFound();
  if (statement.mapping_status !== "staged") {
    return fail(
      422,
      "mapping_not_staged",
      `Mapping is ${statement.mapping_status} — only staged mappings can be edited`,
    );
  }

  const body = (await request.json()) as {
    updates?: Array<{ line_item_id: string; canonical_key: string | null }>;
    additions?: Array<{
      canonical_key: string;
      amount: number;
      label?: string;
    }>;
    currency?: string;
  };

  const org = db.orgs.find((item) => item.id === orgId);
  if (body.currency && org && body.currency !== org.currency) {
    return fail(
      422,
      "currency_mismatch",
      `Statement currency ${body.currency} does not match the org currency ${org.currency} — no FX in v1`,
    );
  }

  for (const update of body.updates ?? []) {
    const item = db.lineItems.find(
      (li) => li.id === update.line_item_id && li.statement_id === id,
    );
    if (!item) return notFound();
    if (update.canonical_key === null) {
      item.canonical_key = null;
      item.status = "unmapped"; // parked — excluded from ratios
    } else {
      if (!isCanonicalKey(update.canonical_key)) {
        return fail(
          422,
          "validation_failed",
          `Unknown canonical key: ${update.canonical_key} — the vocabulary is closed`,
        );
      }
      item.canonical_key = update.canonical_key;
      item.status = "mapped";
      item.mapped_by = "user";
      item.confidence = null;
    }
  }

  for (const addition of body.additions ?? []) {
    if (!isCanonicalKey(addition.canonical_key)) {
      return fail(
        422,
        "validation_failed",
        `Unknown canonical key: ${addition.canonical_key} — the vocabulary is closed`,
      );
    }
    // Parser-missed rows count toward the identity check.
    db.lineItems.push({
      id: nextId(`${statement.id}-li`),
      statement_id: statement.id,
      canonical_key: addition.canonical_key,
      source_label: addition.label ?? "Added in review",
      amount: addition.amount,
      status: "mapped",
      confidence: null,
      mapped_by: "user",
      derived: false,
    });
  }

  const lineItems = db.lineItems.filter(
    (item) => item.statement_id === statement.id,
  );
  return ok({ statement, line_items: lineItems });
}
