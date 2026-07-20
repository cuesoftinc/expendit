"use client";

/**
 * StatementView — design.md §8.2 (Figma 98:743): kind balance_sheet /
 * income_statement / cash_flow · human line labels with the canonical key
 * secondary in mono · derived rows bold with an "ƒ derived" chip (formula
 * tooltip) · "N unmapped" tag + mapping-warning badges · green
 * identity-check footer when the balance sheet balances · period +
 * header-action slot (Export) in the card header (pages.md B6).
 */

import React from "react";
import { Check, TriangleAlert } from "lucide-react";
import type { LineItem, StatementKind } from "@/models";
import {
  CANONICAL_KEY_LABELS,
  IDENTITY_TOLERANCE,
} from "@/models/registry/line-items";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import Tag from "./Tag";
import Tooltip from "./Tooltip";

const KIND_LABEL: Record<StatementKind, string> = {
  balance_sheet: "Balance sheet",
  income_statement: "Income statement",
  cash_flow: "Cash flow",
};

export interface StatementViewProps {
  kind: StatementKind;
  period: string;
  currency?: string;
  lineItems: LineItem[];
  /** Identity/derivation warnings raised at review. */
  mappingWarnings?: string[];
  /** Derived-row formula notes keyed by canonical key. */
  formulaNotes?: Record<string, string>;
  /** Period-selector control (PeriodPicker instance). */
  periodSelector?: React.ReactNode;
  /** Card-header actions (Export lives here per the frame). */
  headerActions?: React.ReactNode;
  className?: string;
}

export const StatementView: React.FC<StatementViewProps> = ({
  kind,
  period,
  currency = "NGN",
  lineItems,
  mappingWarnings = [],
  formulaNotes = {},
  periodSelector,
  headerActions,
  className,
}) => {
  // Parked (unmapped) rows are excluded from the normalized statement —
  // they surface as the "N unmapped" tag, never as fabricated lines.
  const rows = lineItems.filter((item) => item.status === "mapped");
  const unmappedCount = lineItems.length - rows.length;

  // Identity check (line-items.md §4): Assets = Liabilities + Equity
  // within ±1% — the green footer is the trust affordance for a
  // balanced sheet.
  const amountOf = (key: string): number | undefined =>
    rows.find((item) => item.canonical_key === key)?.amount;
  const assets = amountOf("total_assets");
  const liabilities = amountOf("total_liabilities");
  const equity = amountOf("equity");
  const identityBalanced =
    kind === "balance_sheet" &&
    assets !== undefined &&
    liabilities !== undefined &&
    equity !== undefined &&
    Math.abs(assets - (liabilities + equity)) <=
      IDENTITY_TOLERANCE * Math.max(Math.abs(assets), 1);

  return (
    <section
      data-kind={kind}
      className={cn("rounded border border-border", className)}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border bg-bg-elev px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-text">
            {KIND_LABEL[kind]}
          </h3>
          <p className="text-[13px] tabular-nums text-text-2">{period}</p>
        </div>
        <div className="flex items-center gap-2">
          {unmappedCount > 0 ? (
            <Tag tint="warn" size="md">
              {unmappedCount} unmapped
            </Tag>
          ) : null}
          {periodSelector}
          {headerActions}
        </div>
      </header>

      {mappingWarnings.length > 0 ? (
        <div className="border-b border-border px-4 py-2">
          {mappingWarnings.map((warning) => (
            <span
              key={warning}
              className="mr-1.5 inline-flex items-center gap-1 rounded border border-warn/40 bg-warn/10 px-1.5 py-0 text-[11px] font-medium text-warn"
            >
              <TriangleAlert aria-hidden className="h-3 w-3" />
              {warning}
            </span>
          ))}
        </div>
      ) : null}

      {/* Mobile canon: the statement grid scrolls inside its container
          below lg — the page itself never side-scrolls. */}
      <div className="max-lg:overflow-x-auto">
        <table className="w-full text-[13px]">
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                data-derived={item.derived || undefined}
                className="border-b border-border last:border-b-0"
              >
                <td className="px-4 py-2">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-text",
                        item.derived && "font-semibold",
                      )}
                    >
                      {item.canonical_key
                        ? CANONICAL_KEY_LABELS[item.canonical_key]
                        : item.source_label}
                    </span>
                    {item.derived ? (
                      <Tooltip
                        kind="formula"
                        content={
                          formulaNotes[item.canonical_key ?? ""] ??
                          "Derived by identity, not present in the source"
                        }
                      >
                        <button
                          type="button"
                          aria-label="Derived — how we got this"
                          className="rounded border border-info/40 bg-info/10 px-1.5 py-0 text-[11px] font-medium text-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          ƒ derived
                        </button>
                      </Tooltip>
                    ) : null}
                  </span>
                  {item.canonical_key ? (
                    <span className="block font-mono text-[11px] text-text-2">
                      {item.canonical_key}
                    </span>
                  ) : null}
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-right align-top tabular-nums text-text",
                    item.derived && "font-semibold",
                  )}
                >
                  {formatMoney(item.amount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {identityBalanced ? (
        <footer className="flex items-center gap-1.5 border-t border-border bg-income/[0.08] px-4 py-2 text-[12px] font-medium text-income">
          <Check aria-hidden className="h-3.5 w-3.5" />
          Assets = Liabilities + Equity
        </footer>
      ) : null}
    </section>
  );
};

export default StatementView;
