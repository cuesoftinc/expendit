"use client";

/**
 * B1 `/dashboard` — Overview (pages.md B1): StatCard row (net cash flow,
 * income, expenses, runway — company orgs), 12-month cash-flow chart,
 * category donut, anomaly feed (MI-5), latest transactions (5 → B2).
 * Empty state carries the MI-16 demo-data toggle; loading ships MI-12
 * skeletons. Render-only — state lives in the overview controller.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { useOrg, useOverviewController } from "@/controllers";
import { useCategoriesController } from "@/controllers/use-categories";
import { formatMoney } from "@/lib/format";
import { DEMO_DATASETS } from "@/mock/demo";
import type { TxnEntry } from "@/models";
import AnomalyBadge from "@/components/ui/AnomalyBadge";
import Banner from "@/components/ui/Banner";
import ChartDonut from "@/components/ui/ChartDonut";
import ChartLine from "@/components/ui/ChartLine";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import StatCard from "@/components/ui/StatCard";
import Tag from "@/components/ui/Tag";
import TxnTableRow from "@/components/ui/TxnTableRow";
import PageHeader from "./PageHeader";

const Card: React.FC<{
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, children, action, className }) => (
  <section
    className={`rounded border border-border bg-bg ${className ?? ""}`}
  >
    <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <h2 className="text-[13px] font-medium text-text">{title}</h2>
      {action}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

// Registry default category color — data, not styling (documented raw-hex
// exception per the token rule; mirrors the mock categories default).
const FALLBACK_CATEGORY_COLOR = "#6E6E76";

const monthLabel = (month: string): string => dayjs(`${month}-01`).format("MMM");

export const OverviewView: React.FC = () => {
  const router = useRouter();
  const { activeOrg, activeOrgId } = useOrg();
  const { flows, categoryTotals, anomalies, latest, loading, error } =
    useOverviewController(activeOrgId);
  const { items: categories } = useCategoriesController(activeOrgId);
  const [demoEnabled, setDemoEnabled] = useState(false);

  const currency = activeOrg?.currency ?? "NGN";
  const categoryById = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat])),
    [categories],
  );

  const points = flows?.items ?? [];
  const current = points[points.length - 1];
  const previous = points[points.length - 2];
  const prevLabel = previous ? monthLabel(previous.month) : "";
  const delta = (cur: number, prev: number | undefined): number | undefined =>
    prev !== undefined && prev > 0 ? (cur - prev) / prev : undefined;

  const isEmpty =
    !loading && latest.length === 0 && (current?.income ?? 0) === 0;

  if (loading) {
    return (
      <>
        <PageHeader title="Overview" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <StatCard key={i} label="" value={0} loading />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
          <ChartLine state="loading" />
          <ChartDonut state="loading" />
        </div>
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="row" />
          ))}
        </div>
      </>
    );
  }

  if (isEmpty && !demoEnabled) {
    return (
      <>
        <PageHeader title="Overview" />
        <EmptyState
          kind="transactions"
          onAction={() => router.push("/dashboard/imports?upload=1")}
          demoToggle={{ enabled: demoEnabled, onChange: setDemoEnabled }}
          className="mx-auto mt-16 max-w-md"
        />
      </>
    );
  }

  // MI-16: the demo-data toggle previews the synthetic freelancer set
  // (clearly badged; design.md §8.3).
  if (isEmpty && demoEnabled) {
    const demo = DEMO_DATASETS.freelancer;
    const demoCatById = new Map(demo.categories.map((cat) => [cat.id, cat]));
    return (
      <>
        <PageHeader
          title="Overview"
          actions={
            <Tag tint="info" size="md">
              Demo data
            </Tag>
          }
        />
        <div className="mb-4">
          <EmptyState
            kind="transactions"
            onAction={() => router.push("/dashboard/imports?upload=1")}
            demoToggle={{ enabled: demoEnabled, onChange: setDemoEnabled }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card title="Cash flow — trailing 12 months">
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
            />
          </Card>
          <Card title="Spending by category">
            <ChartDonut
              slices={demo.donut.slices}
              centerTotal={demo.donut.centerTotal}
              centerCaption="this month"
              legend="bottom"
            />
          </Card>
        </div>
        <Card title="Latest transactions" className="mt-4">
          <table className="w-full" aria-label="Demo transactions">
            <tbody className="contents">
              {demo.txns.slice(0, 5).map((txn) => (
              <TxnTableRow
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
                  demoCatById.get(txn.categoryId) ?? {
                    id: txn.categoryId,
                    name: txn.categoryId,
                    color: FALLBACK_CATEGORY_COLOR,
                  }
                }
                />
              ))}
            </tbody>
          </table>
        </Card>
      </>
    );
  }

  const donutSlices =
    categoryTotals?.items.map((item) => {
      const cat = categoryById.get(item.category_id);
      return {
        id: item.category_id,
        label: cat?.name ?? item.category_id,
        value: item.total,
        color: cat?.color ?? FALLBACK_CATEGORY_COLOR,
      };
    }) ?? [];
  const donutTotal = donutSlices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <>
      <PageHeader title="Overview" />

      {error ? (
        <div className="mb-4">
          <Banner kind="error">{error}</Banner>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          deltaCaption={prevLabel ? `vs ${prevLabel}` : undefined}
          sparkline={points.map((p) => p.income - p.expense)}
        />
        <StatCard
          label="Income"
          value={current?.income ?? 0}
          format={(value) => formatMoney(value, currency)}
          delta={current ? delta(current.income, previous?.income) : undefined}
          deltaCaption={prevLabel ? `vs ${prevLabel}` : undefined}
          sparkline={points.map((p) => p.income)}
        />
        <StatCard
          label="Expenses"
          value={current?.expense ?? 0}
          format={(value) => formatMoney(value, currency)}
          delta={
            current ? delta(current.expense, previous?.expense) : undefined
          }
          deltaCaption={prevLabel ? `vs ${prevLabel}` : undefined}
          sparkline={points.map((p) => p.expense)}
        />
        {flows?.runway.months != null ? (
          <StatCard
            label="Runway"
            value={flows.runway.months}
            format={(value) => `${value.toFixed(1)} mo`}
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card title="Cash flow — trailing 12 months">
          <ChartLine
            state={points.length === 0 ? "empty" : "data"}
            emptyKind="transactions"
            series={[
              {
                id: "income",
                label: "Income",
                color: "income",
                points: points.map((p) => p.income),
              },
              {
                id: "expense",
                label: "Expenses",
                color: "expense",
                points: points.map((p) => p.expense),
              },
            ]}
            xLabels={points
              .filter((_, index) => index % 2 === 0)
              .map((p) => monthLabel(p.month))}
          />
        </Card>
        <Card title="Spending by category">
          <ChartDonut
            state={donutSlices.length === 0 ? "empty" : "data"}
            emptyKind="transactions"
            slices={donutSlices}
            centerTotal={formatMoney(donutTotal, currency, { decimals: 0 })}
            centerCaption="this month"
            legend="bottom"
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,2fr]">
        <Card title="Anomalies" action={<Tag tint="warn" count={anomalies.length} />}>
          {anomalies.length === 0 ? (
            <p className="text-[13px] text-text-2">
              Nothing unusual in your ledger.
            </p>
          ) : (
            <ul className="space-y-3">
              {anomalies.map((txn: TxnEntry) => (
                <li key={txn.id}>
                  <AnomalyBadge
                    type={txn.anomalies[0].rule_id}
                    severity={txn.anomalies[0].severity}
                    variant="feed"
                    description={`${txn.description} — ${formatMoney(txn.amount, currency)}`}
                    timestamp={dayjs(txn.txn_date).format("D MMM")}
                    onClick={() =>
                      router.push(
                        `/dashboard/transactions?record=${txn.id}&explain=1`,
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title="Latest transactions"
          action={
            <Link
              href="/dashboard/transactions"
              className="text-[13px] font-medium text-accent hover:underline"
            >
              View all
            </Link>
          }
        >
          {latest.length === 0 ? (
            <p className="text-[13px] text-text-2">No transactions yet.</p>
          ) : (
            <table className="w-full" aria-label="Latest transactions">
              <tbody className="contents">
                {latest.map((txn) => (
                  <TxnTableRow
                    key={txn.id}
                    txn={txn}
                    category={
                      categoryById.get(txn.category_id) ?? {
                        id: txn.category_id,
                        name: txn.category_id,
                        color: FALLBACK_CATEGORY_COLOR,
                      }
                    }
                    onOpen={() =>
                      router.push(`/dashboard/transactions?record=${txn.id}`)
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
};

export default OverviewView;
