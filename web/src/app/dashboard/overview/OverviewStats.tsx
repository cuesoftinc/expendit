import React from "react";
import type { MonthlyFlowReport } from "@/models";
import { formatMoney } from "@/lib/format";
import StatCard from "@/components/ui/StatCard";
import { monthLabel } from "./constants";

interface OverviewStatsProps {
  flows: MonthlyFlowReport | null;
  currency: string;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  flows,
  currency,
}) => {
  const points = flows?.items ?? [];
  const current = points.at(-1);
  const previous = points.at(-2);
  const prevLabel = previous ? monthLabel(previous.month) : "";
  const delta = (currentValue: number, previousValue: number | undefined) =>
    previousValue !== undefined && previousValue > 0
      ? (currentValue - previousValue) / previousValue
      : undefined;
  const caption = prevLabel ? `vs ${prevLabel}` : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Net cash flow"
        value={current ? current.income - current.expense : 0}
        format={(value) => formatMoney(value, currency)}
        delta={
          current && previous
            ? delta(
                current.income - current.expense,
                previous.income - previous.expense,
              )
            : undefined
        }
        deltaCaption={caption}
        sparkline={points.map((point) => point.income - point.expense)}
      />
      <StatCard
        label="Income"
        value={current?.income ?? 0}
        format={(value) => formatMoney(value, currency)}
        delta={current ? delta(current.income, previous?.income) : undefined}
        deltaCaption={caption}
        sparkline={points.map((point) => point.income)}
      />
      <StatCard
        label="Expenses"
        deltaDirection="down-good"
        value={current?.expense ?? 0}
        format={(value) => formatMoney(value, currency)}
        delta={current ? delta(current.expense, previous?.expense) : undefined}
        deltaCaption={caption}
        sparkline={points.map((point) => point.expense)}
      />
      {flows?.runway.months != null ? (
        <StatCard
          label="Runway"
          value={flows.runway.months}
          format={(value) => `${value.toFixed(1)} months`}
        />
      ) : (
        <div className="flex flex-col justify-between rounded border border-border bg-bg p-4">
          <span className="text-[13px] text-text-2">Runway</span>
          <span className="mt-1 text-lg font-semibold text-text-2">n/a</span>
          <span className="mt-1 text-[11px] leading-4 text-text-2">
            {flows?.runway.na_reason ?? ""}
          </span>
        </div>
      )}
    </div>
  );
};
