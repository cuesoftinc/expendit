/**
 * FilingHistoryRow — design.md §8.2b: tax kind + period + authority +
 * deadline columns · stamped-✓ receipt download · immutable (no edit
 * affordances by construction).
 */

import React from "react";
import { Download } from "lucide-react";
import type { TaxFiling } from "@/models";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import StampedCheck from "./StampedCheck";

export interface FilingHistoryRowProps {
  filing: TaxFiling;
  currency?: string;
  onDownloadReceipt?: () => void;
  className?: string;
}

export const FilingHistoryRow: React.FC<FilingHistoryRowProps> = ({
  filing,
  currency = "NGN",
  onDownloadReceipt,
  className,
}) => (
  <div
    role="row"
    data-status={filing.status}
    className={cn(
      "flex items-center gap-3 border-b border-border px-3 py-2 text-[13px] text-text",
      className,
    )}
  >
    <span className="w-10 shrink-0 font-medium uppercase">{filing.kind}</span>
    <span className="w-24 shrink-0 tabular-nums text-text-2">
      {filing.period}
    </span>
    <span className="min-w-0 flex-1 truncate text-text-2">
      {filing.authority.name}
    </span>
    <span className="w-28 shrink-0 text-right tabular-nums">
      {formatMoney(filing.amount_due, currency)}
    </span>
    <span className="w-24 shrink-0 tabular-nums text-text-2">
      due {filing.due_date}
    </span>
    <span className="flex w-20 shrink-0 items-center justify-end gap-1.5">
      {filing.status === "accepted" || filing.status === "submitted" ? (
        <>
          <StampedCheck size="md" label={`${filing.kind} filed`} className="!h-6 !w-6" />
          {filing.artifact_key ? (
            <button
              type="button"
              aria-label="Download receipt"
              onClick={onDownloadReceipt}
              className="rounded p-1 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Download className="h-4 w-4" />
            </button>
          ) : null}
        </>
      ) : (
        <span className="text-[11px] font-medium uppercase text-text-2">
          {filing.status}
        </span>
      )}
    </span>
  </div>
);

export default FilingHistoryRow;
