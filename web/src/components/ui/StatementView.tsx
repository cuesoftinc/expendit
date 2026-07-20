"use client";

/**
 * StatementView — design.md §8.2 + Figma 98:743: kind balance_sheet /
 * income_statement / cash_flow · human line labels from the canonical
 * vocabulary (models registry) · derived rows bold + "ƒ derived" chip
 * (formula tooltip) · unmapped count tag in the header · identity-check
 * footer (green when the statement ties out) · mapping-warning badges ·
 * period-selector header (pages.md B6 statement view).
 */

import React from "react";
import { Check, TriangleAlert } from "lucide-react";
import type { LineItem, StatementKind } from "@/models";
import {
  CANONICAL_KEY_LABELS,
  IDENTITY_TOLERANCE,
  type CanonicalKey,
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

/**
 * Statement identities (line-items.md §4) rendered as the footer check —
 * the Figma frame's green "Assets = Liabilities + Equity" band,
 * generalized per kind.
 */
const IDENTITY_CHECKS: Record<
  StatementKind,
  { label: string; left: CanonicalKey; right: Array<[CanonicalKey, 1 | -1]> }
> = {
  balance_sheet: {
    label: "Assets = Liabilities + Equity",
    left: "total_assets",
    right: [
      ["total_liabilities", 1],
      ["equity", 1],
    ],
  },
  income_statement: {
    label: "Net income = Operating profit + Interest income − Interest expense − Tax",
    left: "net_income",
    right: [
      ["operating_profit", 1],
      ["interest_income", 1],
      ["interest_expense", -1],
      ["tax_expense", -1],
    ],
  },
  cash_flow: {
    label: "Net change in cash = CFO + CFI + CFF",
    left: "net_change_in_cash",
    right: [
      ["cfo", 1],
      ["cfi", 1],
      ["cff", 1],
    ],
  },
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
  className,
}) => {
  const unmappedCount = lineItems.filter(
    (item) => item.status === "unmapped",
  ).length;

  const valueOf = (key: CanonicalKey): number | undefined =>
    lineItems.find((item) => item.canonical_key === key)?.amount;
  const identity = IDENTITY_CHECKS[kind];
  const leftValue = valueOf(identity.left);
  const rightValue = identity.right.reduce<number | undefined>(
    (sum, [key, sign]) => {
      const value = valueOf(key);
      return sum === undefined || value === undefined
        ? undefined
        : sum + sign * value;
    },
    0,
  );
  const identityHolds =
    leftValue !== undefined && rightValue !== undefined
      ? Math.abs(leftValue - rightValue) <=
        IDENTITY_TOLERANCE * Math.max(Math.abs(leftValue), 1)
      : null;

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
            <Tag tint="warn">{unmappedCount} unmapped</Tag>
          ) : null}
          {periodSelector}
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
            {lineItems.map((item) => (
              <tr
                key={item.id}
                data-derived={item.derived || undefined}
                className="border-b border-border last:border-b-0"
              >
                <td className="px-4 py-2 text-text">
                  <span className="flex items-center gap-1.5">
                    {/* Human reading labels win over raw canonical keys
                        (Figma 98:743); unmapped rows keep their source
                        label with a row-level tag. */}
                    <span
                      className={cn(item.derived && "font-semibold")}
                      title={item.canonical_key ?? undefined}
                    >
                      {item.canonical_key
                        ? CANONICAL_KEY_LABELS[item.canonical_key]
                        : item.source_label}
                    </span>
                    {item.status === "unmapped" ? (
                      <Tag tint="warn">unmapped</Tag>
                    ) : null}
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
                          className="rounded border border-info/40 bg-info/10 px-1 py-px font-mono text-[10px] font-medium leading-4 text-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          ƒ derived
                        </button>
                      </Tooltip>
                    ) : null}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-right tabular-nums text-text",
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

      {/* Identity-check footer (Figma 98:743): green when the statement
          ties out within tolerance; amber when it does not. Hidden when
          either side of the identity is absent. */}
      {identityHolds !== null ? (
        <footer
          data-identity={identityHolds ? "pass" : "fail"}
          className={cn(
            "flex items-center gap-1.5 border-t border-border px-4 py-2 text-[12px] font-medium",
            identityHolds ? "bg-income/10 text-income" : "bg-warn/10 text-warn",
          )}
        >
          {identityHolds ? (
            <Check aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
          )}
          Identity check{identityHolds ? "" : " failed"} — {identity.label}
        </footer>
      ) : null}
    </section>
  );
};

export default StatementView;
