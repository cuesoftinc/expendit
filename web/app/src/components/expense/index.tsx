"use client";
import React, { useEffect, useState } from "react";
import Input from "@/components/signup/Input";
import inputStyles from "@/components/signup/styles";
import { useExpenseCustomState } from "./states";
import LoaderSpinner from "../helpers/LoaderSpinner";
import styles from "./styles";
import { useHomeContext } from "@/context";
import { API } from "@/API/axiosSetup";
import { getLocalStorageItem } from "@/utils/localStorage";

const Index = () => {
  const {
    form,
    category,
    categories,
    formatValue,
    formLoading,
    handleCategory,
    handleChange,
    handleSubmit,
  } = useExpenseCustomState();

  const { expenseData: contextExpenses } = useHomeContext();
  const [expenseList, setExpenseList] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    const raw = getLocalStorageItem("Expendit-userID");
    const userID = raw ? JSON.parse(raw) : null;

    // Fetch expenses directly so we're not tied to context load timing
    if (userID) {
      API.get(`/expense/user/${userID}?page=1&per_page=50`)
        .then((res) => {
          if (res.data?.results) setExpenseList(res.data.results);
        })
        .catch(() => {});
    }

    // AI summary
    if (!userID) { setSummaryLoading(false); return; }
    API.get(`/ai/summary/${userID}`)
      .then((res) => setAiSummary(res.data?.summary || ""))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  // Prefer directly-fetched list; fall back to context
  const expenseData = expenseList.length > 0 ? expenseList : (contextExpenses || []);

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
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-purple-600 font-semibold text-sm">AI Insights</span>
          <span className="text-xs bg-purple-100 text-purple-500 px-2 py-0.5 rounded-full">Last 3 months</span>
        </div>
        {summaryLoading ? (
          <p className="text-sm text-slate-400 animate-pulse">Analysing your finances...</p>
        ) : aiSummary ? (
          <p className="text-sm text-slate-700 leading-relaxed">{aiSummary}</p>
        ) : (
          <p className="text-sm text-slate-400">No data yet — import a bank statement to get insights.</p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Add Expense Form */}
        <div className="md:w-[420px] w-full">
          <h3 className={styles.header}>Add new expense</h3>
          <Input
            label="Amount"
            name="amount"
            type="text"
            value={formatValue(form.amount)}
            placeholder="Your expense amount"
            handleChange={handleChange}
            custom
          />
          <div>
            <label className={inputStyles.label}>Category</label>
            <select
              className={styles.select}
              onChange={handleCategory}
              value={category}
            >
              <option value="">Choose a category</option>
              {categories?.map((cat: any, index: number) => (
                <option value={cat.name} key={index}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label className={inputStyles.label}>Note</label>
            <textarea
              rows={4}
              name="note"
              value={form.note}
              className={styles.textarea}
              maxLength={50}
              onChange={handleChange}
            />
          </div>
          <button
            type="submit"
            disabled={formLoading}
            className={inputStyles.btn}
            onClick={handleSubmit}
          >
            {formLoading ? (
              <LoaderSpinner style="spin" variant="spin-small" />
            ) : (
              "Add expense"
            )}
          </button>
        </div>

        {/* Expense List */}
        <div className="flex-1">
          <h3 className={styles.header}>Recent expenses</h3>
          {!expenseData || expenseData.length === 0 ? (
            <p className="text-sm text-slate-400 mt-4">No expenses recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Note</th>
                    <th className="py-3 pr-4">Category</th>
                    <th className="py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseData.map((expense: any) => (
                    <tr
                      key={expense._id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                        {formatDate(expense.created_at || expense.createdat)}
                      </td>
                      <td className="py-3 pr-4 text-slate-700 max-w-[180px] truncate">
                        {expense.note || "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                          {expense.category || "Other"}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-red-500 whitespace-nowrap">
                        -{formatAmount(expense.amount)}
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

