import React from "react";
import type { MonthlyFlowPoint } from "@/models";
import { formatIso } from "@/lib/dates";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import ChartLine from "@/components/ui/ChartLine";
import { monthLabel } from "./constants";
import { OverviewCard } from "./OverviewCard";

interface CashFlowPanelProps {
  points: MonthlyFlowPoint[];
  currency: string;
  showDataTable: boolean;
  onToggle: () => void;
}

export const CashFlowPanel: React.FC<CashFlowPanelProps> = ({
  points,
  currency,
  showDataTable,
  onToggle,
}) => (
  <OverviewCard
    fill
    className="lg:min-h-(--widget-h-chart-card)"
    title={
      points.length >= 12 || points.length === 0
        ? "Cash flow — 12 months"
        : `Cash flow — since ${formatIso(`${points[0].month}-01`, "MMM yyyy")}`
    }
    action={
      <button
        type="button"
        onClick={onToggle}
        className="rounded border border-border bg-bg-elev px-2 py-0.5 text-[12px] font-medium text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {showDataTable ? "Chart" : "Data table"}
      </button>
    }
  >
    {showDataTable ? (
      <div className="max-lg:overflow-x-auto">
        <table
          className="w-full min-w-[420px] text-[13px]"
          aria-label="Cash flow data"
        >
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-2">
              <th scope="col" className="py-1.5 font-medium">
                Month
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Income
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Expenses
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Net
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr
                key={point.month}
                className="border-b border-border last:border-b-0"
              >
                <td className="py-1.5">{monthLabel(point.month)}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatMoney(point.income, currency, { decimals: 0 })}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatMoney(point.expense, currency, { decimals: 0 })}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatMoney(point.income - point.expense, currency, {
                    decimals: 0,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <ChartLine
        fill
        state={points.length === 0 ? "empty" : "data"}
        emptyKind="transactions"
        series={[
          {
            id: "net",
            label: "Net cash flow",
            color: "accent",
            points: points.map((point) => point.income - point.expense),
          },
        ]}
        xLabels={points
          .filter((_, index) => index % 2 === 0)
          .map((point) => monthLabel(point.month))}
        xLabelIndices={points
          .map((_, index) => index)
          .filter((index) => index % 2 === 0)}
        yTickFormat={(value) => formatMoneyCompact(value, currency)}
      />
    )}
  </OverviewCard>
);
