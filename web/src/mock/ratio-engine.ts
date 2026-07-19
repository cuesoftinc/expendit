/**
 * Mock ratio engine — computes the 22 registry metrics (line-items.md §5)
 * from confirmed statements + the ledger (runway), with formula traces,
 * benchmark-band classification, degenerate-denominator rules, growth
 * rules, and the runway burn-source rule.
 */

import type { RatioReport, RatioResult, RatioStatus } from "@/models";
import type { CanonicalKey } from "@/models/registry/line-items";
import {
  annualizationFactor,
  periodDayCount,
} from "@/models/registry/line-items";
import { classify, RATIO_REGISTRY } from "@/models/registry/ratios";
import { mockNow } from "./clock";
import { getDb, nextId, type MockDb } from "./db";

interface ValueRef {
  amount: number;
  id: string;
  key: CanonicalKey;
}

interface PeriodValues {
  values: Partial<Record<CanonicalKey, ValueRef>>;
  kinds: Set<string>;
}

const collectValues = (
  db: MockDb,
  orgId: string,
  period: string,
): PeriodValues => {
  const values: Partial<Record<CanonicalKey, ValueRef>> = {};
  const kinds = new Set<string>();
  for (const statement of db.statements) {
    if (
      statement.org_id !== orgId ||
      statement.period !== period ||
      statement.mapping_status !== "confirmed"
    ) {
      continue;
    }
    kinds.add(statement.kind);
    for (const item of db.lineItems) {
      if (
        item.statement_id === statement.id &&
        item.status === "mapped" &&
        item.canonical_key
      ) {
        values[item.canonical_key] = {
          amount: item.amount,
          id: item.id,
          key: item.canonical_key,
        };
      }
    }
  }
  return { values, kinds };
};

/** Previous same-kind period (growth rules: never mixed granularity). */
export const previousPeriod = (period: string): string | null => {
  const q = period.match(/^(\d{4})-Q([1-4])$/);
  if (q) {
    const year = Number(q[1]);
    const quarter = Number(q[2]);
    return quarter === 1 ? `${year - 1}-Q4` : `${year}-Q${quarter - 1}`;
  }
  const h = period.match(/^(\d{4})-H([12])$/);
  if (h) {
    const year = Number(h[1]);
    return h[2] === "1" ? `${year - 1}-H2` : `${year}-H1`;
  }
  const fy = period.match(/^FY(\d{4})$/);
  if (fy) return `FY${Number(fy[1]) - 1}`;
  return null;
};

const KIND_OF_KEY: Record<
  string,
  "balance_sheet" | "income_statement" | "cash_flow"
> = {
  cash_and_equivalents: "balance_sheet",
  receivables: "balance_sheet",
  inventory: "balance_sheet",
  current_assets: "balance_sheet",
  current_liabilities: "balance_sheet",
  short_term_debt: "balance_sheet",
  long_term_debt: "balance_sheet",
  total_liabilities: "balance_sheet",
  total_assets: "balance_sheet",
  equity: "balance_sheet",
  revenue: "income_statement",
  cogs: "income_statement",
  gross_profit: "income_statement",
  operating_profit: "income_statement",
  depreciation_amortization: "income_statement",
  interest_expense: "income_statement",
  net_income: "income_statement",
  cfo: "cash_flow",
  capex: "cash_flow",
};

/** Ledger monthly nets for the trailing 3 complete months before "today". */
const ledgerBurn = (
  db: MockDb,
  orgId: string,
): { burn: number | null; months: number; positive: boolean } => {
  const today = mockNow();
  const nets: number[] = [];
  for (let offset = 1; offset <= 3; offset += 1) {
    const month = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    let hasTxn = false;
    let net = 0;
    for (const txn of db.transactions) {
      if (txn.org_id !== orgId || !txn.txn_date.startsWith(key)) continue;
      hasTxn = true;
      net += txn.direction === "income" ? txn.amount : -txn.amount;
    }
    if (hasTxn) nets.push(net);
  }
  if (nets.length < 3)
    return { burn: null, months: nets.length, positive: false };
  const avgNet = nets.reduce((sum, value) => sum + value, 0) / nets.length;
  if (avgNet >= 0) return { burn: null, months: nets.length, positive: true };
  return { burn: -avgNet, months: nets.length, positive: false };
};

export const computeRatioReport = (
  orgId: string,
  period: string,
): RatioReport => {
  const db = getDb();
  const { values, kinds } = collectValues(db, orgId, period);
  const prevValues = (() => {
    const prev = previousPeriod(period);
    return prev ? collectValues(db, orgId, prev).values : {};
  })();

  const factor = annualizationFactor(period);
  const days = periodDayCount(period);

  const val = (key: CanonicalKey): ValueRef | undefined => values[key];

  const missingKindNa = (needed: CanonicalKey[]): { reason: string } | null => {
    for (const key of needed) {
      if (values[key] === undefined) {
        const kind = KIND_OF_KEY[key];
        if (kind && !kinds.has(kind)) {
          return { reason: `n/a — missing ${kind} for ${period}` };
        }
        return { reason: `n/a — ${key} not mapped for ${period}` };
      }
    }
    return null;
  };

  const results: RatioResult[] = [];

  for (const def of RATIO_REGISTRY) {
    const base: Omit<
      RatioResult,
      "value" | "status" | "na_reason" | "badge" | "inputs" | "trace_notes"
    > = {
      key: def.key,
      label: def.label,
      group: def.group,
      display: def.display,
      direction: def.direction,
      formula: def.formula,
      benchmark_band: def.band?.label ?? null,
      period_delta: null,
    };

    const na = (reason: string, notes: string[] = []): RatioResult => ({
      ...base,
      value: null,
      status: "na",
      na_reason: reason,
      badge: null,
      inputs: [],
      trace_notes: notes,
    });

    const done = (
      value: number,
      inputs: ValueRef[],
      notes: string[] = [],
      badge: string | null = null,
    ): RatioResult => {
      const bandStatus = classify(value, def.band);
      const status: RatioStatus = bandStatus ?? "healthy";
      return {
        ...base,
        value,
        status: def.band ? status : "healthy",
        na_reason: null,
        badge,
        // Resolved trace inputs (id + key + amount) — auditable on sight.
        inputs: inputs.map((input) => ({
          id: input.id,
          canonical_key: input.key,
          amount: input.amount,
        })),
        trace_notes: [
          ...notes,
          "v1 uses period-end values (period-average denominators are later)",
        ],
      };
    };

    /** Simple a/b ratio with degenerate-denominator handling. */
    const ratio = (
      numKeys: CanonicalKey[],
      denKeys: CanonicalKey[],
      compute: (get: (key: CanonicalKey) => number) => number,
      options: {
        annualizeNumerator?: boolean;
        zeroDenominatorReason?: string;
        extraNotes?: string[];
      } = {},
    ): RatioResult => {
      const missing = missingKindNa([...numKeys, ...denKeys]);
      if (missing) return na(missing.reason);
      const refs = [...numKeys, ...denKeys].map((key) => val(key) as ValueRef);
      const get = (key: CanonicalKey): number => {
        const raw = (val(key) as ValueRef).amount;
        const isFlow = KIND_OF_KEY[key] === "income_statement";
        return options.annualizeNumerator && isFlow ? raw * factor : raw;
      };
      const denominator = denKeys.reduce(
        (sum, key) => sum + (val(key) as ValueRef).amount,
        0,
      );
      if (denominator === 0) {
        return na(
          options.zeroDenominatorReason ?? `n/a — zero denominator`,
          options.extraNotes,
        );
      }
      const notes = [...(options.extraNotes ?? [])];
      if (options.annualizeNumerator && factor !== 1) {
        notes.push(`flow figures annualized ×${factor} (${period})`);
      }
      return done(compute(get), refs, notes);
    };

    switch (def.key) {
      case "current_ratio":
        results.push(
          ratio(
            ["current_assets"],
            ["current_liabilities"],
            (get) => get("current_assets") / get("current_liabilities"),
          ),
        );
        break;
      case "quick_ratio":
        results.push(
          ratio(
            ["current_assets", "inventory"],
            ["current_liabilities"],
            (get) =>
              (get("current_assets") - get("inventory")) /
              get("current_liabilities"),
          ),
        );
        break;
      case "cash_ratio":
        results.push(
          ratio(
            ["cash_and_equivalents"],
            ["current_liabilities"],
            (get) => get("cash_and_equivalents") / get("current_liabilities"),
          ),
        );
        break;
      case "working_capital": {
        const missing = missingKindNa([
          "current_assets",
          "current_liabilities",
        ]);
        if (missing) {
          results.push(na(missing.reason));
          break;
        }
        results.push(
          done(
            (val("current_assets") as ValueRef).amount -
              (val("current_liabilities") as ValueRef).amount,
            [
              val("current_assets") as ValueRef,
              val("current_liabilities") as ValueRef,
            ],
            ["currency value — renders as StatCard/MoneyCell, not a gauge"],
          ),
        );
        break;
      }
      case "debt_to_equity": {
        const missing = missingKindNa([
          "short_term_debt",
          "long_term_debt",
          "equity",
        ]);
        if (missing) {
          results.push(na(missing.reason));
          break;
        }
        const equity = (val("equity") as ValueRef).amount;
        if (equity <= 0) {
          results.push({
            ...na("negative equity"),
            badge: "negative equity",
          });
          break;
        }
        results.push(
          ratio(
            ["short_term_debt", "long_term_debt"],
            ["equity"],
            (get) =>
              (get("short_term_debt") + get("long_term_debt")) / get("equity"),
          ),
        );
        break;
      }
      case "debt_ratio":
        results.push(
          ratio(
            ["total_liabilities"],
            ["total_assets"],
            (get) => get("total_liabilities") / get("total_assets"),
          ),
        );
        break;
      case "interest_coverage":
        results.push(
          ratio(
            ["operating_profit"],
            ["interest_expense"],
            (get) => get("operating_profit") / get("interest_expense"),
            { zeroDenominatorReason: "n/a — no interest expense" },
          ),
        );
        break;
      case "interest_coverage_ebitda": {
        // Shown only when D&A was separately mapped (line-items.md §5).
        if (values.depreciation_amortization === undefined) continue;
        results.push(
          ratio(
            ["operating_profit", "depreciation_amortization"],
            ["interest_expense"],
            (get) =>
              (get("operating_profit") + get("depreciation_amortization")) /
              get("interest_expense"),
            { zeroDenominatorReason: "n/a — no interest expense" },
          ),
        );
        break;
      }
      case "gross_margin":
        results.push(
          ratio(
            ["gross_profit"],
            ["revenue"],
            (get) => get("gross_profit") / get("revenue"),
          ),
        );
        break;
      case "operating_margin":
        results.push(
          ratio(
            ["operating_profit"],
            ["revenue"],
            (get) => get("operating_profit") / get("revenue"),
          ),
        );
        break;
      case "net_margin":
        results.push(
          ratio(
            ["net_income"],
            ["revenue"],
            (get) => get("net_income") / get("revenue"),
          ),
        );
        break;
      case "roa":
        results.push(
          ratio(
            ["net_income"],
            ["total_assets"],
            (get) => get("net_income") / get("total_assets"),
            { annualizeNumerator: true },
          ),
        );
        break;
      case "roe": {
        const missing = missingKindNa(["net_income", "equity"]);
        if (missing) {
          results.push(na(missing.reason));
          break;
        }
        const equity = (val("equity") as ValueRef).amount;
        if (equity <= 0) {
          results.push({ ...na("negative equity"), badge: "negative equity" });
          break;
        }
        results.push(
          ratio(
            ["net_income"],
            ["equity"],
            (get) => get("net_income") / get("equity"),
            { annualizeNumerator: true },
          ),
        );
        break;
      }
      case "asset_turnover":
        results.push(
          ratio(
            ["revenue"],
            ["total_assets"],
            (get) => get("revenue") / get("total_assets"),
            { annualizeNumerator: true },
          ),
        );
        break;
      case "inventory_turnover": {
        const missing = missingKindNa(["cogs", "inventory"]);
        if (missing) {
          results.push(na(missing.reason));
          break;
        }
        if ((val("inventory") as ValueRef).amount === 0) {
          results.push(na("n/a — no inventory"));
          break;
        }
        results.push(
          ratio(
            ["cogs"],
            ["inventory"],
            (get) => get("cogs") / get("inventory"),
            { annualizeNumerator: true },
          ),
        );
        break;
      }
      case "receivables_days":
        results.push(
          ratio(
            ["receivables"],
            ["revenue"],
            (get) => (get("receivables") / get("revenue")) * days,
            {
              extraNotes: [
                `uses the period's actual day count (${days} days), not a hardcoded 365`,
              ],
            },
          ),
        );
        break;
      case "operating_cash_flow_ratio":
        results.push(
          ratio(
            ["cfo"],
            ["current_liabilities"],
            (get) => get("cfo") / get("current_liabilities"),
          ),
        );
        break;
      case "free_cash_flow": {
        const missing = missingKindNa(["cfo", "capex"]);
        if (missing) {
          results.push(na(missing.reason));
          break;
        }
        results.push(
          done(
            (val("cfo") as ValueRef).amount + (val("capex") as ValueRef).amount,
            [val("cfo") as ValueRef, val("capex") as ValueRef],
            [
              "cash-flow keys are signed as reported — capex negative",
              "currency value — renders as StatCard/MoneyCell",
            ],
          ),
        );
        break;
      }
      case "cfo_to_total_debt":
        results.push(
          ratio(
            ["cfo"],
            ["short_term_debt", "long_term_debt"],
            (get) =>
              get("cfo") / (get("short_term_debt") + get("long_term_debt")),
          ),
        );
        break;
      case "revenue_growth":
      case "net_income_growth": {
        const key: CanonicalKey =
          def.key === "revenue_growth" ? "revenue" : "net_income";
        const current = values[key];
        const previous = prevValues[key];
        if (!current) {
          results.push(na(`n/a — ${key} not mapped for ${period}`));
          break;
        }
        if (!previous) {
          results.push(na("n/a — no prior period"));
          break;
        }
        if (previous.amount <= 0) {
          results.push(
            na("n/a — sign change", [
              `absolute change: ${current.amount - previous.amount} (prior value ≤ 0 — percentage suppressed)`,
            ]),
          );
          break;
        }
        results.push(
          done(
            (current.amount - previous.amount) / previous.amount,
            [current, previous],
            [
              `consecutive same-kind periods (${previousPeriod(period)} → ${period})`,
            ],
          ),
        );
        break;
      }
      case "runway_months": {
        const cash = values.cash_and_equivalents;
        if (!cash) {
          results.push(na(`n/a — missing balance_sheet for ${period}`));
          break;
        }
        // Burn: from cfo when ≥3 confirmed cash-flow periods exist, else
        // from the ledger's monthly net cash flow (line-items.md §5).
        const cfPeriods = db.statements.filter(
          (statement) =>
            statement.org_id === orgId &&
            statement.kind === "cash_flow" &&
            statement.mapping_status === "confirmed",
        ).length;
        if (cfPeriods >= 3) {
          // Not exercised by the seed (no cash-flow statements seeded);
          // ledger burn below is the covered path.
          results.push(na("n/a — statement-burn path not seeded"));
          break;
        }
        const { burn, months, positive } = ledgerBurn(db, orgId);
        if (positive) {
          results.push(na("n/a — cash-flow positive", ["burn source: ledger"]));
          break;
        }
        if (burn === null) {
          results.push(
            na("n/a — insufficient history", [
              `burn source: ledger (${months} of 3 trailing months present)`,
            ]),
          );
          break;
        }
        results.push(
          done(
            Math.round((cash.amount / burn) * 10) / 10,
            [cash],
            [
              "burn source: ledger (income − expenses, trailing 3 months)",
              `average monthly net cash burn: ${Math.round(burn)}`,
            ],
          ),
        );
        break;
      }
      default:
        break;
    }
  }

  return {
    id: nextId("ratio-report"),
    org_id: orgId,
    period,
    ratios: results,
    computed_at: mockNow().toISOString(),
  };
};

/** Compute-or-return-cached report for GET /ratios. */
export const getOrComputeReport = (
  orgId: string,
  period: string,
): RatioReport => {
  const db = getDb();
  const existing = db.ratioReports.find(
    (report) => report.org_id === orgId && report.period === period,
  );
  if (existing) return existing;
  const report = computeRatioReport(orgId, period);
  db.ratioReports.push(report);
  return report;
};

/** Recompute and replace (POST /ratios/compute; supersede path). */
export const recomputeReport = (orgId: string, period: string): RatioReport => {
  const db = getDb();
  const report = computeRatioReport(orgId, period);
  const index = db.ratioReports.findIndex(
    (item) => item.org_id === orgId && item.period === period,
  );
  if (index >= 0) db.ratioReports[index] = report;
  else db.ratioReports.push(report);
  return report;
};
