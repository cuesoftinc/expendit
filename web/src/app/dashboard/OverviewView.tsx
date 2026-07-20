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
import { cn } from "@/lib/cn";
import { formatIso, daysUntil } from "@/lib/dates";
import { useOrg, useOverviewController } from "@/controllers";
import { useCategoriesController } from "@/controllers/use-categories";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import { DEMO_DATASETS } from "@/mock/demo";
import type { TxnEntry } from "@/models";
import AnomalyBadge from "@/components/ui/AnomalyBadge";
import Banner from "@/components/ui/Banner";
import ChartDonut from "@/components/ui/ChartDonut";
import ChartLine from "@/components/ui/ChartLine";
import EmptyState from "@/components/ui/EmptyState";
import PeriodPicker from "@/components/ui/PeriodPicker";
import TableHeader from "@/components/ui/TableHeader";
import Skeleton from "@/components/ui/Skeleton";
import StatCard from "@/components/ui/StatCard";
import Tag from "@/components/ui/Tag";
import TxnTableRow from "@/components/ui/TxnTableRow";
import PageHeader from "./PageHeader";

const Card: React.FC<{
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  /** Body becomes a column flex so a fill-mode chart can stretch. */
  fill?: boolean;
  className?: string;
}> = ({ title, children, action, fill, className }) => (
  <section
    className={cn(
      "rounded border border-border bg-bg",
      fill && "lg:flex lg:flex-col",
      className,
    )}
  >
    <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <h2 className="text-[13px] font-medium text-text">{title}</h2>
      {action}
    </header>
    <div
      className={cn("p-4", fill && "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col")}
    >
      {children}
    </div>
  </section>
);

// Registry default category color — data, not styling (documented raw-hex
// exception per the token rule; mirrors the mock categories default).
const FALLBACK_CATEGORY_COLOR = "#6E6E76";

const monthLabel = (month: string): string => formatIso(`${month}-01`, "MMM");

export const OverviewView: React.FC = () => {
  const router = useRouter();
  const { activeOrg, activeOrgId } = useOrg();
  const {
    flows,
    categoryTotals,
    anomalies,
    latest,
    estimates,
    loading,
    error,
    loadCategoryTotals,
  } = useOverviewController(activeOrgId);
  const { items: categories } = useCategoriesController(activeOrgId);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [showDataTable, setShowDataTable] = useState(false);
  const [deadlineDismissed, setDeadlineDismissed] = useState(false);

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <StatCard key={i} label="" value={0} loading />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
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
              yTickFormat={(value) => formatMoneyCompact(value, demo.currency)}
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
          {/* Mobile: the ledger table scrolls inside its container —
              the page itself never side-scrolls (mobile canon). */}
          <div className="max-lg:overflow-x-auto">
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
          </div>
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
  const donutMonthLabel = categoryTotals
    ? formatIso(`${categoryTotals.month}-01`, "MMM yyyy")
    : "";

  // MI-13: the nearest tax deadline (≤30 days out) banners the overview.
  const nearestDeadline = estimates
    .map((estimate) => ({
      ...estimate,
      daysToDue: daysUntil(estimate.due_date),
    }))
    .filter((estimate) => estimate.daysToDue >= 0 && estimate.daysToDue <= 30)
    .sort((a, b) => a.daysToDue - b.daysToDue)[0];

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <div className="w-36">
            <PeriodPicker
              mode="month"
              value={categoryTotals?.month ?? null}
              onValueChange={(month) => void loadCategoryTotals(month)}
            />
          </div>
        }
      />

      {error ? (
        <div className="mb-4">
          <Banner kind="error">{error}</Banner>
        </div>
      ) : null}

      {nearestDeadline && !deadlineDismissed ? (
        <div className="mb-4">
          <Banner
            kind={nearestDeadline.daysToDue <= 7 ? "warn" : "info"}
            onDismiss={() => setDeadlineDismissed(true)}
            action={
              <Link
                href="/dashboard/taxes/file"
                className="text-[13px] font-medium text-accent hover:underline"
              >
                Prepare filing
              </Link>
            }
          >
            {nearestDeadline.kind.toUpperCase()} return due{" "}
            {nearestDeadline.daysToDue === 0
              ? "today"
              : nearestDeadline.daysToDue === 1
                ? "tomorrow"
                : `in ${nearestDeadline.daysToDue} days`}{" "}
            — {formatIso(nearestDeadline.due_date, "d MMM yyyy")}
          </Banner>
        </div>
      ) : null}

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
          deltaDirection="down-good"
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

      {/* Figma 179:12: chart left (2/3), donut + anomalies right (1/3).
          Default grid stretch (no items-start): the chart card's bottom
          tracks the rail's — its fill-mode plot absorbs the difference
          (user report: the band read bottom-ragged at lg). */}
      <div
        data-testid="overview-mid-band"
        className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]"
      >
        <Card
          fill
          // The monthly series starts at ledger onset (no fabricated
          // pre-onset months) — the title states the span it actually has.
          title={
            points.length >= 12 || points.length === 0
              ? "Cash flow — 12 months"
              : `Cash flow — since ${formatIso(`${points[0].month}-01`, "MMM yyyy")}`
          }
          action={
            // Chart data-table toggle (design.md §5 — screen assembly).
            <button
              type="button"
              onClick={() => setShowDataTable((prev) => !prev)}
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
                  points: points.map((p) => p.income - p.expense),
                },
              ]}
              xLabels={points
                .filter((_, index) => index % 2 === 0)
                .map((p) => monthLabel(p.month))}
              xLabelIndices={points
                .map((_, index) => index)
                .filter((index) => index % 2 === 0)}
              yTickFormat={(value) => formatMoneyCompact(value, currency)}
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card title={`Expenses by category — ${donutMonthLabel}`}>
            {donutSlices.length === 0 ? (
              <p className="text-[13px] text-text-2">
                No expenses recorded for {donutMonthLabel}.
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <ChartDonut
                  slices={donutSlices}
                  // Compact center total per the ChartDonut master
                  // ("₦3.61M" — caption above, value below).
                  centerTotal={formatMoneyCompact(donutTotal, currency, {
                    decimals: 2,
                  })}
                  centerCaption="Expenses"
                  legend="none"
                />
                {/* Screen-level legend with values (Figma B1 template):
                    top 5 slices + an aggregated Other row so the shares
                    always sum to 100% (system QA 2026-07-19 — the tail
                    was silently dropped and the legend read 95%). */}
                <dl className="min-w-0 flex-1 space-y-1.5 text-[12px]">
                  {[
                    ...donutSlices.slice(0, 5),
                    ...(donutSlices.length > 5
                      ? [
                          {
                            id: "other",
                            label: "Other",
                            // Neutral secondary token color — data tail.
                            color: "var(--text-2)",
                            value: donutSlices
                              .slice(5)
                              .reduce((sum, slice) => sum + slice.value, 0),
                          },
                        ]
                      : []),
                  ].map((slice) => (
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
                        {donutTotal > 0
                          ? `${Math.round((slice.value / donutTotal) * 100)}%`
                          : "—"}{" "}
                        {formatMoney(slice.value, currency, { decimals: 0 })}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Card>

          <Card
            title="Anomalies"
            action={<Tag tint="warn" count={anomalies.length} />}
          >
            {anomalies.length === 0 ? (
              <p className="text-[13px] text-text-2">
                Nothing unusual in your ledger.
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {anomalies.slice(0, 3).map((txn: TxnEntry) => (
                    <li key={txn.id}>
                      <AnomalyBadge
                        type={txn.anomalies[0].rule_id}
                        severity={txn.anomalies[0].severity}
                        variant="feed"
                        description={`${txn.description} — ${formatMoney(txn.amount, currency)}`}
                        timestamp={formatIso(txn.txn_date, "d MMM")}
                        onClick={() =>
                          router.push(
                            `/dashboard/transactions?record=${txn.id}&explain=1`,
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard/transactions?anomalies=1"
                  className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline"
                >
                  Explain in ledger →
                </Link>
              </>
            )}
          </Card>
        </div>
      </div>

      <Card
        title="Latest transactions"
        className="mt-4"
        action={
          <Link
            href="/dashboard/transactions"
            className="text-[13px] font-medium text-accent hover:underline"
          >
            View all →
          </Link>
        }
      >
        {latest.length === 0 ? (
          <p className="text-[13px] text-text-2">No transactions yet.</p>
        ) : (
          // Mobile canon: the ledger table scrolls inside its container.
          <div className="max-lg:overflow-x-auto">
            <table
              className="w-full border-separate border-spacing-0"
              aria-label="Latest transactions"
            >
              <TableHeader
                columns={[
                  { id: "date", label: "Date", widthClass: "w-14" },
                  { id: "source", label: "Src", widthClass: "w-8" },
                  { id: "description", label: "Description" },
                  { id: "category", label: "Category", widthClass: "w-40" },
                  {
                    id: "amount",
                    label: "Amount",
                    numeric: true,
                    widthClass: "w-32",
                  },
                ]}
              />
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
          </div>
        )}
      </Card>
    </>
  );
};

export default OverviewView;
