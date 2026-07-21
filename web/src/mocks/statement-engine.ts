/**
 * Mock statement engine — derivation + cross-check + confirm-time
 * validation rules (line-items.md §4; flows/statement-mapping.md).
 */

import type { FinStatement, LineItem } from "@/models";
import {
  DERIVATIONS,
  IDENTITY_TOLERANCE,
  UNMAPPED_VALUE_THRESHOLD,
} from "@/models/registry/line-items";
import { getDb, nextId } from "./db";

export const statementLineItems = (statementId: string): LineItem[] =>
  getDb().lineItems.filter((item) => item.statement_id === statementId);

/**
 * Run derivations for a statement: derived keys compute when absent and
 * cross-check when present (>1% divergence → mapping_warning).
 * Returns warnings; appends computed derived rows to the store.
 */
export const runDerivations = (statement: FinStatement): string[] => {
  const db = getDb();
  const warnings: string[] = [];
  const items = () => statementLineItems(statement.id);

  for (const derivation of DERIVATIONS) {
    if (derivation.kind !== statement.kind) continue;
    const terms = derivation.terms
      .map(([key, sign]) => {
        const item = items().find(
          (li) => li.canonical_key === key && li.status === "mapped",
        );
        return item ? item.amount * sign : null;
      })
      .filter((value): value is number => value !== null);
    if (terms.length === 0) continue;
    const computed = terms.reduce((sum, value) => sum + value, 0);

    const existing = items().find(
      (li) => li.canonical_key === derivation.key && li.status === "mapped",
    );
    if (existing) {
      const basis = Math.max(Math.abs(existing.amount), 1);
      if (Math.abs(existing.amount - computed) / basis > IDENTITY_TOLERANCE) {
        warnings.push(
          `${derivation.key}: reported ${existing.amount} differs from component sum ${computed} by >1%`,
        );
      }
    } else {
      db.lineItems.push({
        id: nextId(`${statement.id}-derived`),
        statement_id: statement.id,
        canonical_key: derivation.key,
        source_label: "",
        amount: computed,
        status: "mapped",
        confidence: null,
        mapped_by: "user",
        derived: true,
      });
    }
  }
  return warnings;
};

export interface ConfirmCheck {
  ok: boolean;
  code?: "mapping_identity_violation" | "unmapped_threshold_exceeded";
  message?: string;
  details?: Record<string, unknown>;
}

/** Confirm-time validations (line-items.md §4). */
export const validateConfirm = (statement: FinStatement): ConfirmCheck => {
  const items = statementLineItems(statement.id);

  // >20% unmapped value by magnitude blocks confirm.
  const mappedValue = items
    .filter((item) => item.status === "mapped")
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const unmappedValue = items
    .filter((item) => item.status === "unmapped")
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const total = mappedValue + unmappedValue;
  if (total > 0 && unmappedValue / total > UNMAPPED_VALUE_THRESHOLD) {
    return {
      ok: false,
      code: "unmapped_threshold_exceeded",
      message:
        "More than 20% of statement value (by magnitude) is unmapped — map or remove rows before confirming",
      details: { unmapped_share: unmappedValue / total },
    };
  }

  // Balance sheets must satisfy total_assets ≈ total_liabilities + equity.
  if (statement.kind === "balance_sheet") {
    const value = (key: string): number | null => {
      const item = items.find(
        (li) => li.canonical_key === key && li.status === "mapped",
      );
      return item ? item.amount : null;
    };
    const assets = value("total_assets");
    const liabilities = value("total_liabilities");
    const equity = value("equity");
    // A missing side counts as 0 — a sheet with assets but no mapped
    // liability/equity rows (or vice versa: liabilities/equity but no
    // asset side, Codex review on PR #209) VIOLATES the identity rather
    // than skipping it; line-items.md §4 requires the identity to hold
    // before `confirmed`.
    if (assets !== null || liabilities !== null || equity !== null) {
      const basis = Math.max(
        Math.abs(assets ?? 0),
        Math.abs((liabilities ?? 0) + (equity ?? 0)),
        1,
      );
      if (
        Math.abs((assets ?? 0) - ((liabilities ?? 0) + (equity ?? 0))) / basis >
        IDENTITY_TOLERANCE
      ) {
        return {
          ok: false,
          code: "mapping_identity_violation",
          message:
            "total_assets must equal total_liabilities + equity within ±1%",
          details: {
            total_assets: assets ?? 0,
            total_liabilities: liabilities ?? 0,
            equity: equity ?? 0,
          },
        };
      }
    }
  }
  return { ok: true };
};
