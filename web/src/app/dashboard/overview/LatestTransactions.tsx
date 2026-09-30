import React from "react";
import Link from "next/link";
import type { Category, TxnEntry } from "@/models";
import TableHeader from "@/components/ui/TableHeader";
import { FALLBACK_CATEGORY_COLOR } from "./constants";
import { OverviewCard } from "./OverviewCard";
import OverviewTxnTableRow from "./OverviewTxnTableRow";

interface LatestTransactionsProps {
  transactions: TxnEntry[];
  categoryById: Map<string, Category>;
  onOpen: (id: string) => void;
  onExplainAnomaly: (id: string) => void;
}

const columns = [
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

export const LatestTransactions: React.FC<LatestTransactionsProps> = ({
  transactions,
  categoryById,
  onOpen,
  onExplainAnomaly,
}) => (
  <OverviewCard
    title="Latest transactions"
    className="mt-4 min-w-0 lg:min-h-(--widget-h-latest-card)"
    action={
      <Link
        href="/dashboard/transactions"
        className="text-[13px] font-medium text-accent-text hover:underline"
      >
        View all →
      </Link>
    }
  >
    {transactions.length === 0 ? (
      <p className="text-[13px] text-text-2">No transactions yet.</p>
    ) : (
      <div className="min-w-0 overflow-x-auto">
        <table
          className="min-w-[824px] w-full border-separate border-spacing-0"
          aria-label="Latest transactions"
        >
          <TableHeader columns={columns} />
          <tbody className="contents">
            {transactions.map((txn) => (
              <OverviewTxnTableRow
                key={txn.id}
                txn={txn}
                category={
                  categoryById.get(txn.category_id) ?? {
                    id: txn.category_id,
                    name: txn.category_id,
                    color: FALLBACK_CATEGORY_COLOR,
                  }
                }
                onOpen={() => onOpen(txn.id)}
                onExplainAnomaly={() => onExplainAnomaly(txn.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    )}
  </OverviewCard>
);
