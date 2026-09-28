import React from "react";
import { DEMO_DATASETS } from "@/mocks/demo";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import ChartDonut from "@/components/ui/ChartDonut";
import ChartLine from "@/components/ui/ChartLine";
import StatCard from "@/components/ui/StatCard";
import TableHeader from "@/components/ui/TableHeader";
import { FALLBACK_CATEGORY_COLOR } from "./constants";
import { OverviewCard } from "./OverviewCard";
import OverviewTxnTableRow from "./OverviewTxnTableRow";

const transactionColumns = [
  {
    id: "date-time",
    label: "Date & Time",
    widthClass: "w-48",
    headerAlign: "left" as const,
  },
  {
    id: "source",
    label: "Src",
    widthClass: "w-8",
    headerAlign: "left" as const,
  },
  { id: "description", label: "Description", headerAlign: "left" as const },
  {
    id: "category",
    label: "Category",
    widthClass: "w-56",
    headerAlign: "left" as const,
  },
  {
    id: "signals",
    label: "Signals",
    widthClass: "w-32",
    headerAlign: "left" as const,
  },
  { id: "amount", label: "Amount", numeric: true, widthClass: "w-32" },
];

/** Synthetic preview shown from the empty state; it never writes demo data. */
export const DemoOverview: React.FC = () => {
  const demo = DEMO_DATASETS.freelancer;
  const categoryById = new Map(
    demo.categories.map((category) => [category.id, category]),
  );
  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[demo.stats.net, demo.stats.income, demo.stats.expenses].map(
          (stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              format={(value) => formatMoney(value, demo.currency)}
              delta={stat.delta}
              deltaCaption={demo.deltaCaption}
              sparkline={stat.sparkline}
            />
          ),
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <OverviewCard title="Cash flow — trailing 12 months">
          <ChartLine
            series={[
              {
                id: "net",
                label: "Net cash flow",
                color: "accent",
                points: demo.cashflow.points,
              },
            ]}
            xLabels={demo.cashflow.xLabels}
            yTickFormat={(value) => formatMoneyCompact(value, demo.currency)}
          />
        </OverviewCard>
        <OverviewCard title="Spending by category">
          <ChartDonut
            slices={demo.donut.slices}
            centerTotal={demo.donut.centerTotal}
            centerCaption="this month"
            legend="bottom"
          />
        </OverviewCard>
      </div>
      <OverviewCard title="Latest transactions" className="mt-4 min-w-0">
        <div className="min-w-0 overflow-x-auto">
          <table
            className="min-w-[824px] w-full border-separate border-spacing-0"
            aria-label="Demo transactions"
          >
            <TableHeader columns={transactionColumns} />
            <tbody className="contents">
              {demo.txns.slice(0, 5).map((txn) => (
                <OverviewTxnTableRow
                  key={txn.id}
                  txn={{
                    id: txn.id,
                    org_id: "demo",
                    description: txn.description,
                    amount: txn.amount,
                    direction: txn.direction,
                    category_id: txn.categoryId,
                    txn_date: txn.date,
                    source: txn.source,
                    source_link_id: null,
                    ai_categorized: txn.ai ?? false,
                    excluded_from_reports: false,
                    anomalies: [],
                    created_at: txn.date,
                  }}
                  category={
                    categoryById.get(txn.categoryId) ?? {
                      id: txn.categoryId,
                      name: txn.categoryId,
                      color: FALLBACK_CATEGORY_COLOR,
                    }
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </OverviewCard>
    </div>
  );
};
