"use client";

import React from "react";
import dayjs from "dayjs";
import { MdWarningAmber, MdCheckCircleOutline } from "react-icons/md";
import LoaderSpinner from "@/components/helpers/LoaderSpinner";
import { styles } from "./styles";
import type { ImportResult, ImportedTransaction, Anomaly, Currency } from "./types";

interface Props {
  result: ImportResult;
  transactions: ImportedTransaction[];
  categories: string[];
  currency: Currency;
  isLoading: boolean;
  error: string | null;
  onCategoryChange: (id: string, category: string) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 0 }).format(
    Math.round(n)
  );

const anomalyLabel: Record<string, string> = {
  large_transaction: "Large transaction",
  spending_spike: "Spending spike",
  abnormal_category: "Abnormal spending",
  duplicate_charge: "Possible duplicate",
};

const ReviewStep: React.FC<Props> = ({
  result,
  transactions,
  categories,
  currency,
  isLoading,
  error,
  onCategoryChange,
  onConfirm,
  onDiscard,
}) => {
  const sym = currency.symbol;
  const { job } = result;
  const summary = job.summary;
  const anomalies: Anomaly[] = job.anomalies ?? [];

  // Category totals sorted descending
  const catEntries = summary
    ? Object.entries(summary.by_category).sort((a, b) => b[1] - a[1])
    : [];
  const maxCat = catEntries[0]?.[1] ?? 1;

  return (
    <div>
      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{job.total_parsed}</p>
          <p className={styles.statLabel}>Transactions extracted</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{job.duplicates_found}</p>
          <p className={styles.statLabel}>Duplicates skipped</p>
        </div>
        <div className={styles.statCard}>
          <p className={`${styles.statValue} text-purpleTheme`}>{job.imported}</p>
          <p className={styles.statLabel}>Ready to import</p>
        </div>
      </div>

      {/* Financial summary */}
      {summary && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard("bg-green-500")}>
            <p className={styles.summaryLabel}>Total Income</p>
            <p className={styles.summaryAmount}>{sym}{fmt(summary.total_income)}</p>
          </div>
          <div className={styles.summaryCard("bg-red-400")}>
            <p className={styles.summaryLabel}>Total Expenses</p>
            <p className={styles.summaryAmount}>{sym}{fmt(summary.total_expenses)}</p>
          </div>
          <div
            className={styles.summaryCard(
              summary.net_cash_flow >= 0 ? "bg-purpleTheme" : "bg-slate-600"
            )}
          >
            <p className={styles.summaryLabel}>Net Cash Flow</p>
            <p className={styles.summaryAmount}>
              {summary.net_cash_flow < 0 ? "-" : ""}{sym}
              {fmt(Math.abs(summary.net_cash_flow))}
            </p>
          </div>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className={styles.anomalyBanner}>
          <p className={styles.anomalyTitle}>
            <MdWarningAmber className="text-amber-500" />
            {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"} detected
          </p>
          {anomalies.map((a, i) => (
            <p key={i} className={styles.anomalyItem}>
              <span className="mt-0.5">·</span>
              <span>
                <span className="font-semibold">{anomalyLabel[a.type] ?? a.type}:</span>{" "}
                {a.description}
              </span>
            </p>
          ))}
        </div>
      )}

      {/* Category breakdown */}
      {catEntries.length > 0 && (
        <div className={styles.categorySection}>
          <p className={styles.sectionTitle}>Spending by category</p>
          {catEntries.map(([cat, amount]) => (
            <div key={cat} className={styles.categoryRow}>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{cat}</span>
                  <span className="text-gray-500">{sym}{fmt(amount)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div
                    className={styles.categoryBar}
                    style={{ width: `${(amount / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction table */}
      <p className={styles.sectionTitle}>
        Transactions ({transactions.length})
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Description</th>
              <th className={styles.th}>Amount</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Category</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                  No transactions to show.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50 transition">
                  <td className={styles.td}>
                    {dayjs(txn.date).format("DD MMM YYYY")}
                  </td>
                  <td className={`${styles.td} max-w-[200px] truncate`}>
                    {txn.description}
                  </td>
                  <td className={`${styles.td} font-medium`}>
                    {sym}{fmt(txn.amount)}
                  </td>
                  <td className={styles.td}>
                    <span className={styles.typeBadge(txn.type)}>
                      {txn.type}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <select
                      className={styles.categorySelect}
                      value={txn.category}
                      onChange={(e) => onCategoryChange(txn.id, e.target.value)}
                    >
                      {/* Always show the current value even if not in list */}
                      {!categories.includes(txn.category) && (
                        <option value={txn.category}>{txn.category}</option>
                      )}
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {/* Action buttons */}
      <div className={styles.actionBar}>
        <button
          className={styles.discardBtn}
          onClick={onDiscard}
          disabled={isLoading}
        >
          Discard
        </button>
        <button
          className={styles.confirmBtn}
          onClick={onConfirm}
          disabled={isLoading || transactions.length === 0}
        >
          {isLoading ? (
            <LoaderSpinner style="spin" variant="spin-small" />
          ) : (
            `Confirm import (${transactions.length})`
          )}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
