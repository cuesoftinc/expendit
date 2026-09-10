"use client";

import AnomalyBadge from "@/components/ui/AnomalyBadge";
import Button from "@/components/ui/Button";
import Inspector from "@/components/ui/Inspector";
import MoneyCell from "@/components/ui/MoneyCell";
import { formatIso } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { AnomalySeverity, TxnEntry } from "@/models";

import type { CategoryOption } from "@/components/ui/CategoryChip";
import type { InspectorState } from "./types";

/** B2b explain panel: severity reads human, never the raw enum. */
const SEVERITY_LABEL: Record<AnomalySeverity, string> = {
  info: "Info",
  warn: "Warning",
};

/** Median amount of the comparable set (B2b explain footer). */
const median = (txns: TxnEntry[]): number => {
  const sorted = [...txns].map((txn) => txn.amount).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

interface TransactionAnomalyInspectorProps {
  inspector: InspectorState;
  closeInspector: () => void;
  saving: boolean;
  activeTxn: TxnEntry | undefined;
  markExpected: () => Promise<void>;
  currency: string;
  categoryById: Map<string, CategoryOption>;
  comparableTxns: TxnEntry[];
}

export default function TransactionAnomalyInspector({
  inspector,
  closeInspector,
  saving,
  activeTxn,
  markExpected,
  currency,
  categoryById,
  comparableTxns,
}: TransactionAnomalyInspectorProps) {
  return (
    <>
      {/* Anomaly-explain inspector (design.md §8.2 variant, B2b frame
          208:3967: humanized severity, provenance/rule-version line,
          median footer, Cancel / Mark expected actions) */}
      <Inspector
        open={inspector.kind === "anomaly"}
        onClose={closeInspector}
        title="Why this was flagged"
        variant="anomaly-explain"
        footer={
          <div className="flex justify-end gap-2">
            <Button kind="quiet" size="sm" onClick={closeInspector}>
              Cancel
            </Button>
            {/* The AI-trust affordance: expected patterns stop flagging. */}
            <Button
              size="sm"
              loading={saving}
              disabled={!activeTxn || activeTxn.anomalies.length === 0}
              onClick={() => void markExpected()}
            >
              Mark expected
            </Button>
          </div>
        }
      >
        {activeTxn && activeTxn.anomalies.length > 0 ? (
          <div className="space-y-4">
            <AnomalyBadge
              type={activeTxn.anomalies[0].rule_id}
              severity={activeTxn.anomalies[0].severity}
              variant="feed"
              description={activeTxn.anomalies[0].note}
            />
            <dl className="space-y-1 text-[13px]">
              <div className="flex justify-between gap-2">
                <dt className="text-text-2">Transaction</dt>
                <dd className="truncate">{activeTxn.description}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-2">Amount</dt>
                <dd>
                  <MoneyCell
                    amount={activeTxn.amount}
                    direction={activeTxn.direction}
                    currency={currency}
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-2">Severity</dt>
                {/* Human-cased, never the raw enum (B2b frame). */}
                <dd>{SEVERITY_LABEL[activeTxn.anomalies[0].severity]}</dd>
              </div>
            </dl>
            {/* Provenance line (B2b frame): when + which rule build. */}
            <p className="text-[12px] text-text-2">
              Detected{" "}
              {formatIso(
                activeTxn.anomalies[0].detected_at ?? activeTxn.created_at,
                "d MMM yyyy",
              )}{" "}
              · rule:{" "}
              <span className="font-mono">
                {activeTxn.anomalies[0].rule_id}{" "}
                {activeTxn.anomalies[0].rule_version ?? "v1"}
              </span>
            </p>
            <section aria-label="Comparable transactions">
              <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-text-2">
                Comparable transactions
                {" — "}
                {categoryById.get(activeTxn.category_id)?.name ??
                  activeTxn.category_id}
              </h3>
              {comparableTxns.length === 0 ? (
                <p className="text-[13px] text-text-2">
                  No comparable transactions in this category yet.
                </p>
              ) : (
                <>
                  <ul className="space-y-1 text-[13px]">
                    {comparableTxns.map((txn) => (
                      <li key={txn.id} className="flex justify-between gap-2">
                        <span className="truncate text-text-2">
                          {formatIso(txn.txn_date, "d MMM")} · {txn.description}
                        </span>
                        <MoneyCell
                          amount={txn.amount}
                          direction={txn.direction}
                          currency={currency}
                        />
                      </li>
                    ))}
                  </ul>
                  {/* Median footer (B2b frame) — the flagged amount reads
                      against the category's normal. */}
                  <p className="mt-2 border-t border-border pt-2 text-[12px] text-text-2">
                    Median{" "}
                    {formatMoney(median(comparableTxns), currency, {
                      decimals: 0,
                    })}{" "}
                    across {comparableTxns.length} comparable{" "}
                    {comparableTxns.length === 1
                      ? "transaction"
                      : "transactions"}
                  </p>
                </>
              )}
            </section>
          </div>
        ) : (
          <p className="text-[13px] text-text-2">
            This transaction carries no anomaly flags.
          </p>
        )}
      </Inspector>
    </>
  );
}
