import React from "react";
import Link from "next/link";
import type { Category, CategoryTotalsReport, TxnEntry } from "@/models";
import { formatIso } from "@/lib/dates";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import AnomalyBadge from "@/components/ui/AnomalyBadge";
import ChartDonut from "@/components/ui/ChartDonut";
import Tag from "@/components/ui/Tag";
import { FALLBACK_CATEGORY_COLOR } from "./constants";
import { OverviewCard } from "./OverviewCard";

interface OverviewSidePanelsProps {
  categoryTotals: CategoryTotalsReport | null;
  categoryById: Map<string, Category>;
  anomalies: TxnEntry[];
  currency: string;
  onExplainAnomaly: (id: string) => void;
}

export const OverviewSidePanels: React.FC<OverviewSidePanelsProps> = ({
  categoryTotals,
  categoryById,
  anomalies,
  currency,
  onExplainAnomaly,
}) => {
  const slices =
    categoryTotals?.items.map((item) => {
      const category = categoryById.get(item.category_id);
      return {
        id: item.category_id,
        label: category?.name ?? item.category_id,
        value: item.total,
        color: category?.color ?? FALLBACK_CATEGORY_COLOR,
      };
    }) ?? [];
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const month = categoryTotals
    ? formatIso(`${categoryTotals.month}-01`, "MMM yyyy")
    : "";
  const legend = [
    ...slices.slice(0, 5),
    ...(slices.length > 5
      ? [
          {
            id: "other",
            label: "Other",
            color: "var(--text-2)",
            value: slices.slice(5).reduce((sum, slice) => sum + slice.value, 0),
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-4">
      <OverviewCard
        title={`Expenses by category — ${month}`}
        className="lg:min-h-(--widget-h-donut-card)"
      >
        {slices.length === 0 ? (
          <p className="text-[13px] text-text-2">
            No expenses recorded for {month}.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <ChartDonut
              slices={slices}
              centerTotal={formatMoneyCompact(total, currency, { decimals: 2 })}
              centerCaption="Expenses"
              legend="none"
            />
            <dl className="min-w-0 flex-1 space-y-1.5 text-[12px]">
              {legend.map((slice) => (
                <div
                  key={slice.id}
                  className="flex items-center justify-between gap-2"
                >
                  <dt className="flex min-w-0 items-center gap-1.5 text-text-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate">{slice.label}</span>
                  </dt>
                  <dd className="whitespace-nowrap tabular-nums text-text">
                    {total > 0
                      ? `${Math.round((slice.value / total) * 100)}%`
                      : "—"}{" "}
                    {formatMoney(slice.value, currency, { decimals: 0 })}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </OverviewCard>
      <OverviewCard
        title="Anomalies"
        className="lg:min-h-(--widget-h-anomaly-card)"
        action={<Tag tint="warn" count={anomalies.length} />}
      >
        {anomalies.length === 0 ? (
          <p className="text-[13px] text-text-2">
            Nothing unusual in your ledger.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {anomalies.slice(0, 3).map((txn) => (
                <li key={txn.id}>
                  <AnomalyBadge
                    type={txn.anomalies[0].rule_id}
                    severity={txn.anomalies[0].severity}
                    variant="feed"
                    description={`${txn.description} — ${formatMoney(txn.amount, currency)}`}
                    timestamp={formatIso(txn.txn_date, "d MMM")}
                    onClick={() => onExplainAnomaly(txn.id)}
                  />
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/transactions?anomalies=1"
              className="mt-3 inline-block text-[13px] font-medium text-accent-text hover:underline"
            >
              Explain in ledger →
            </Link>
          </>
        )}
      </OverviewCard>
    </div>
  );
};
