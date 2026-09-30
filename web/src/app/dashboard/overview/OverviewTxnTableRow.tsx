"use client";

/**
 * Overview-only latest-transaction row. The B1 summary deliberately has a
 * different, fixed six-column shape from the selectable B2 ledger row.
 */

import React from "react";
import {
  Camera,
  FileSpreadsheet,
  FileText,
  Landmark,
  Pencil,
} from "lucide-react";
import { formatIso } from "@/lib/dates";
import type { TxnEntry, TxnSource } from "@/models";
import AnomalyBadge from "@/components/ui/AnomalyBadge";
import CategoryChip, {
  type CategoryOption,
} from "@/components/ui/CategoryChip";
import { cn } from "@/lib/cn";
import MoneyCell from "@/components/ui/MoneyCell";

const SOURCE_ICON: Record<
  TxnSource,
  { Icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  manual: { Icon: Pencil, label: "Manual entry" },
  csv: { Icon: FileSpreadsheet, label: "CSV import" },
  pdf: { Icon: FileText, label: "PDF import" },
  receipt: { Icon: Camera, label: "Receipt capture" },
  bank: { Icon: Landmark, label: "Bank sync" },
};

export interface OverviewTxnTableRowProps {
  txn: TxnEntry;
  category: CategoryOption;
  onOpen?: () => void;
  onExplainAnomaly?: () => void;
}

export const OverviewTxnTableRow: React.FC<OverviewTxnTableRowProps> = ({
  txn,
  category,
  onOpen,
  onExplainAnomaly,
}) => {
  const { Icon: SourceIcon, label: sourceLabel } = SOURCE_ICON[txn.source];
  const anomaly = txn.anomalies[0];

  return (
    <tr
      tabIndex={0}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter") {
          event.preventDefault();
          onOpen?.();
        }
      }}
      className={cn(
        "flex h-[44px] w-full items-center gap-3 border-b border-border px-3 text-[13px] text-text",
        "transition-colors duration-[60ms] ease-standard hover:bg-bg-elev",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
      )}
    >
      <td className="w-48 shrink-0 whitespace-nowrap tabular-nums text-text-2">
        {formatIso(txn.txn_date, "dd-MM-yyyy • hh:mm aa")}
      </td>
      <td className="flex w-8 shrink-0 items-center">
        <SourceIcon
          aria-label={sourceLabel}
          className="h-3.5 w-3.5 shrink-0 text-text-2"
        />
      </td>
      <td className="min-w-0 flex-1">
        <span className="block truncate">{txn.description}</span>
      </td>
      <td className="flex w-56 shrink-0 items-center">
        <CategoryChip category={category} aiSuggested={txn.ai_categorized} />
      </td>
      {/* Always render this cell so a missing anomaly cannot shift Amount. */}
      <td className="flex w-32 shrink-0 items-center">
        {anomaly ? (
          <AnomalyBadge
            type={anomaly.rule_id}
            severity={anomaly.severity}
            variant="inline"
            onClick={onExplainAnomaly}
          />
        ) : null}
      </td>
      <td className="w-32 shrink-0 text-right">
        <MoneyCell
          amount={txn.amount}
          direction={txn.direction}
          withIcon={false}
        />
      </td>
    </tr>
  );
};

export default OverviewTxnTableRow;
