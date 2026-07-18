"use client";

/**
 * StatementView — design.md §8.2: kind balance_sheet / income_statement /
 * cash_flow · derived rows flagged (formula note) · mapping-warning
 * badges · period-selector header (pages.md B6 statement view).
 */

import React from "react";
import { Calculator, TriangleAlert } from "lucide-react";
import type { LineItem, StatementKind } from "@/models";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
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
}) => (
  <section
    data-kind={kind}
    className={cn("rounded border border-border", className)}
  >
    <header className="flex items-center justify-between gap-3 border-b border-border bg-bg-elev px-4 py-3">
      <div>
        <h3 className="text-sm font-semibold text-text">{KIND_LABEL[kind]}</h3>
        <p className="text-[13px] tabular-nums text-text-2">{period}</p>
      </div>
      {periodSelector}
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
                <span className="font-mono text-[12px]">
                  {item.canonical_key ?? item.source_label}
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
                      className="rounded p-0.5 text-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                ) : null}
              </span>
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-text">
              {formatMoney(item.amount, currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

export default StatementView;
