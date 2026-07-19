"use client";

/**
 * Trends controller — B6b trend view (pages.md B6): revenue /
 * gross_profit / net_income time-series across confirmed income-statement
 * periods (line-items.md §5 key line-item rows). Views render only.
 */

import { useEffect, useState } from "react";
import type { FinStatement } from "@/models";
import { statementsRepo } from "@/models/repositories";

export interface TrendSeries {
  labels: string[];
  revenue: number[];
  grossProfit: number[];
  netIncome: number[];
}

export const useTrendsController = (
  statements: FinStatement[],
  orgId?: string,
) => {
  const [trend, setTrend] = useState<TrendSeries | null>(null);

  useEffect(() => {
    const incomeStatements = statements.filter(
      (statement) =>
        statement.kind === "income_statement" &&
        statement.mapping_status === "confirmed",
    );
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (incomeStatements.length === 0) {
        setTrend(null);
        return;
      }
      void Promise.all(
        incomeStatements.map((statement) =>
          statementsRepo.mapping(statement.id, { orgId }),
        ),
      )
        .then((details) => {
          if (cancelled) return;
          const byPeriod = details
            .map((detail) => ({
              period: detail.statement.period,
              value: (key: string) =>
                detail.line_items.find((item) => item.canonical_key === key)
                  ?.amount ?? 0,
            }))
            .sort((a, b) => a.period.localeCompare(b.period));
          setTrend({
            labels: byPeriod.map((entry) => entry.period),
            revenue: byPeriod.map((entry) => entry.value("revenue")),
            grossProfit: byPeriod.map((entry) => entry.value("gross_profit")),
            netIncome: byPeriod.map((entry) => entry.value("net_income")),
          });
        })
        .catch(() => {
          if (!cancelled) setTrend(null);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [statements, orgId]);

  return { trend };
};
