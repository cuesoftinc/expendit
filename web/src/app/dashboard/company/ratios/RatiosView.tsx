"use client";

/**
 * B6b `/dashboard/company/ratios` — Ratio grid (pages.md B6): RatioGauge
 * groups (liquidity / solvency / profitability / efficiency / cash flow &
 * scale / growth), currency values as stat cards (never gauges,
 * line-items.md §5), per-metric "how we got this" formula trace in the
 * Inspector (MI-8), period selector + recompute, and the ratio +
 * line-item trend view across confirmed periods.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useOrg,
  useRatiosController,
  useStatementsController,
  useTrendsController,
} from "@/controllers";
import {
  METRIC_GROUP_LABELS,
  RATIO_REGISTRY,
  type MetricGroup,
} from "@/models/registry/ratios";
import type { RatioResult } from "@/models";
import { formatMoney, formatPercent, formatRatio } from "@/lib/format";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import ChartLine from "@/components/ui/ChartLine";
import EmptyState from "@/components/ui/EmptyState";
import Inspector from "@/components/ui/Inspector";
import PeriodPicker from "@/components/ui/PeriodPicker";
import RatioGauge from "@/components/ui/RatioGauge";
import Skeleton from "@/components/ui/Skeleton";
import Tag from "@/components/ui/Tag";
import PageHeader from "../../PageHeader";

const GROUP_ORDER: MetricGroup[] = [
  "liquidity",
  "solvency",
  "profitability",
  "efficiency",
  "cash_flow_scale",
  "growth",
];

const displayValue = (result: RatioResult, currency: string): string => {
  if (result.value === null) return "n/a";
  switch (result.display) {
    case "percent":
      return formatPercent(result.value);
    case "currency":
      return formatMoney(result.value, currency, { decimals: 0 });
    case "days":
      return `${Math.round(result.value)} days`;
    case "months":
      return `${result.value.toFixed(1)} mo`;
    default:
      return formatRatio(result.value);
  }
};

/** Gauge domain from the registry band (healthy range centered). */
const gaugeDomain = (
  key: string,
  value: number | null,
): { min: number; max: number; band: { from: number; to: number } | null } => {
  const def = RATIO_REGISTRY.find((metric) => metric.key === key);
  const healthy = def?.band?.healthy;
  const hi = healthy?.max ?? healthy?.min ?? (Math.abs(value ?? 1) || 1);
  const max = Math.max(hi * 1.6, value ?? 0, 0.1);
  const min = 0;
  const band = healthy
    ? {
        from: Math.max(healthy.min ?? 0, min),
        to: Math.min(healthy.max ?? max, max),
      }
    : null;
  return { min, max, band };
};

export const RatiosView: React.FC = () => {
  const router = useRouter();
  const { activeOrg, activeOrgId } = useOrg();
  const currency = activeOrg?.currency ?? "NGN";
  const ratios = useRatiosController(activeOrgId);
  const statements = useStatementsController(activeOrgId);

  const confirmedPeriods = useMemo(() => {
    const set = new Set(
      statements.statements
        .filter((statement) => statement.mapping_status === "confirmed")
        .map((statement) => statement.period),
    );
    return [...set];
  }, [statements.statements]);

  const [period, setPeriod] = useState<string | null>(null);
  const [trace, setTrace] = useState<RatioResult | null>(null);

  // Default to the latest confirmed period once statements load.
  useEffect(() => {
    if (period || confirmedPeriods.length === 0) return;
    // Defer to a microtask — effects must not set state synchronously.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const next = confirmedPeriods[confirmedPeriods.length - 1];
      setPeriod(next);
      void ratios.load(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedPeriods, period]);

  // Trend series: revenue / gross_profit / net_income across confirmed
  // income-statement periods (line-items.md §5 trend rows).
  const { trend } = useTrendsController(statements.statements, activeOrgId);

  const grouped = useMemo(() => {
    const map = new Map<MetricGroup, RatioResult[]>();
    for (const result of ratios.report?.ratios ?? []) {
      const group = result.group as MetricGroup;
      map.set(group, [...(map.get(group) ?? []), result]);
    }
    return map;
  }, [ratios.report]);

  const isCompany = activeOrg?.kind === "company";
  const noInputs = !statements.loading && confirmedPeriods.length === 0;

  const openTrace = async (result: RatioResult) => {
    if (!period) return;
    try {
      setTrace(await ratios.trace(result.key, period));
    } catch {
      setTrace(result);
    }
  };

  return (
    <>
      <PageHeader
        title="Ratios"
        description='Benchmark bands are static v1 constants — "general guidance", not industry-specific.'
        actions={
          <>
            <div className="w-40">
              <PeriodPicker
                mode="year"
                value={period}
                onValueChange={(next) => {
                  setPeriod(next);
                  void ratios.load(next);
                }}
                presets={confirmedPeriods.map((value) => ({
                  label: value,
                  value,
                }))}
              />
            </div>
            <Button
              size="sm"
              kind="quiet"
              disabled={!period}
              loading={ratios.loading}
              onClick={() => period && void ratios.compute(period)}
            >
              Recompute
            </Button>
          </>
        }
      />

      {ratios.error ? (
        <div className="mb-4">
          <Banner kind="error">{ratios.error}</Banner>
        </div>
      ) : null}

      {noInputs ? (
        <>
          {!isCompany ? (
            <div className="mb-4">
              <Banner kind="info">
                Ratios read confirmed company statements — statements are
                captured on company orgs (switch or create one).
              </Banner>
            </div>
          ) : null}
          <EmptyState
            kind="ratios"
            onAction={() => router.push("/dashboard/company?upload=1")}
            className="mx-auto mt-16 max-w-md"
          />
        </>
      ) : ratios.loading && !ratios.report ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="chart" />
          ))}
        </div>
      ) : ratios.report ? (
        <>
          {GROUP_ORDER.map((group) => {
            const results = grouped.get(group);
            if (!results || results.length === 0) return null;
            return (
              <section
                key={group}
                aria-label={METRIC_GROUP_LABELS[group]}
                className="mb-6"
              >
                <h2 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-text-2">
                  {METRIC_GROUP_LABELS[group]}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {results.map((result) => {
                    const def = RATIO_REGISTRY.find(
                      (metric) => metric.key === result.key,
                    );
                    const asGauge = def?.gauge && result.display !== "currency";
                    if (asGauge) {
                      const domain = gaugeDomain(result.key, result.value);
                      // RatioGauge carries its own tooltip trigger button
                      // (MI-8) — the trace opens from a sibling button, not
                      // a nested-interactive wrapper (semantic directive).
                      return (
                        <div key={result.key} className="relative w-fit">
                          <RatioGauge
                            label={result.label}
                            value={result.value}
                            display={displayValue(result, currency)}
                            min={domain.min}
                            max={domain.max}
                            status={result.status}
                            band={result.status === "na" ? null : domain.band}
                            delta={result.period_delta ?? undefined}
                            deltaCaption="vs prior period"
                            formula={result.formula}
                            naReason={result.na_reason}
                            caption={result.benchmark_band ?? undefined}
                          />
                          <button
                            type="button"
                            onClick={() => void openTrace(result)}
                            aria-label={`${result.label} — how we got this`}
                            className="absolute right-3 top-3 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] italic text-accent transition-colors duration-fast ease-standard hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            {/* Figma 187:2074: the ƒ formula chip at card top-right. */}
                            ƒ
                          </button>
                        </div>
                      );
                    }
                    // Currency / trend values: stat-card style (never gauges).
                    return (
                      <button
                        key={result.key}
                        type="button"
                        onClick={() => void openTrace(result)}
                        aria-label={`${result.label} — how we got this`}
                        className="flex flex-col justify-between rounded border border-border bg-bg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13px] text-text-2">
                            {result.label}
                          </span>
                          {result.status === "na" ? (
                            <Tag tint="neutral">n/a</Tag>
                          ) : result.badge ? (
                            <Tag tint="warn">{result.badge}</Tag>
                          ) : null}
                        </span>
                        <span className="mt-2 text-xl font-semibold tabular-nums text-text">
                          {displayValue(result, currency)}
                        </span>
                        <span className="mt-1 text-[11px] leading-4 text-text-2">
                          {result.na_reason ?? result.formula}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section aria-label="Trends" className="mb-6">
            <h2 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-text-2">
              Trends
            </h2>
            {trend && trend.labels.length >= 2 ? (
              <div className="rounded border border-border bg-bg p-4">
                <ChartLine
                  series={[
                    {
                      id: "revenue",
                      label: "Revenue",
                      color: "accent",
                      points: trend.revenue,
                    },
                    {
                      id: "gross",
                      label: "Gross profit",
                      color: "income",
                      points: trend.grossProfit,
                    },
                    {
                      id: "net",
                      label: "Net income",
                      color: "expense",
                      points: trend.netIncome,
                    },
                  ]}
                  xLabels={trend.labels}
                />
              </div>
            ) : (
              <p className="rounded border border-border bg-bg px-4 py-6 text-center text-[13px] text-text-2">
                Confirm income statements for at least two periods to see
                revenue, gross-profit, and net-income trends.
              </p>
            )}
          </section>
        </>
      ) : null}

      {/* MI-8 trace inspector: formula + exact line-item inputs */}
      <Inspector
        open={trace !== null}
        onClose={() => setTrace(null)}
        title={trace ? `${trace.label} — how we got this` : ""}
        variant="trace"
      >
        {trace ? (
          <div className="space-y-3">
            <p>
              {trace.label} = {trace.formula}
            </p>
            <p className="text-text-2">
              value: {displayValue(trace, currency)}
              {trace.benchmark_band ? ` · band: ${trace.benchmark_band}` : ""}
            </p>
            {trace.na_reason ? (
              <p className="text-warn">{trace.na_reason}</p>
            ) : null}
            {trace.inputs.length > 0 ? (
              <section aria-label="Inputs">
                <h3 className="mb-1 uppercase tracking-wide text-text-2">
                  line-item inputs
                </h3>
                {/* Resolved inputs: key + amount readable at a glance, the
                    LINE_ITEM id kept as the audit pointer (title). */}
                <ul className="space-y-0.5">
                  {trace.inputs.map((input) => (
                    <li
                      key={input.id}
                      title={input.id}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span>{input.canonical_key}</span>
                      <span className="tabular-nums text-text">
                        {formatMoney(input.amount, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {trace.trace_notes.length > 0 ? (
              <section aria-label="Notes">
                <h3 className="mb-1 uppercase tracking-wide text-text-2">
                  notes
                </h3>
                <ul className="space-y-0.5">
                  {trace.trace_notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </Inspector>
    </>
  );
};

export default RatiosView;
