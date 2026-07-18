"use client";

import styles from "./styles";
import React, { useEffect, useState } from "react";
import Input from "@/components/signup/Input";
import { useIncomeCustomState } from "./states";
import LoaderSpinner from "../helpers/LoaderSpinner";
import { getIncomeListApi } from "@/api/apis/income-api";
import { API } from "@/api/axios-setup";
import { getLocalStorageItem } from "@/utils/local-storage";

const Index = () => {
  const { form, formLoading, formatValue, handleChange, handleSubmit } =
    useIncomeCustomState();

  const [incomeList, setIncomeList] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    getIncomeListApi().then((data) => {
      if (Array.isArray(data)) setIncomeList(data);
      else if (data?.results) setIncomeList(data.results);
    });
    const raw = getLocalStorageItem("Expendit-userID");
    const userID = raw ? JSON.parse(raw) : null;
    if (!userID) {
      setSummaryLoading(false);
      return;
    }
    API.get(`/ai/summary/${userID}`)
      .then((res) => setAiSummary(res.data?.summary || ""))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) =>
    `₦${Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return (
    <div className="md:ml-3 ml-0 space-y-6">
      {/* AI Insights Card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-600 font-semibold text-sm">
            AI Insights
          </span>
          <span className="text-xs bg-green-100 text-green-500 px-2 py-0.5 rounded-full">
            Last 3 months
          </span>
        </div>
        {summaryLoading ? (
          <p className="text-sm text-slate-400 animate-pulse">
            Analysing your finances...
          </p>
        ) : aiSummary ? (
          <p className="text-sm text-slate-700 leading-relaxed">{aiSummary}</p>
        ) : (
          <p className="text-sm text-slate-400">
            No data yet — import a bank statement to get insights.
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Add Income Form */}
        <div className="md:w-[420px] w-full">
          <h1 className={styles.header}>Add your income</h1>
          <form onSubmit={handleSubmit}>
            <Input
              label="Income Source"
              name="source"
              type="text"
              placeholder="Your income source"
              value={form.source}
              handleChange={handleChange}
              custom
            />
            <Input
              label="Amount"
              name="amount"
              type="text"
              placeholder="Your income amount"
              value={formatValue(form.amount)}
              handleChange={handleChange}
              custom
            />
            <Input
              label="Description"
              name="description"
              type="text"
              placeholder="Write a short description"
              value={form.description}
              handleChange={handleChange}
              custom
            />
            <button type="submit" className={styles.btn} disabled={formLoading}>
              {formLoading ? (
                <LoaderSpinner style="spin" variant="spin-small" />
              ) : (
                "Add income"
              )}
            </button>
          </form>
        </div>

        {/* Income List */}
        <div className="flex-1">
          <h1 className={styles.header}>Recent income</h1>
          {incomeList.length === 0 ? (
            <p className="text-sm text-slate-400 mt-4">
              No income recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Source</th>
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeList.map((income: any) => (
                    <tr
                      key={income._id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                        {formatDate(income.created_at)}
                      </td>
                      <td className="py-3 pr-4 text-slate-700 max-w-[150px] truncate">
                        {income.source || "-"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 max-w-[180px] truncate">
                        {income.description || "-"}
                      </td>
                      <td className="py-3 text-right font-semibold text-green-500 whitespace-nowrap">
                        +{formatAmount(income.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
