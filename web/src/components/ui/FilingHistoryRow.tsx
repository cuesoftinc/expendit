/**
 * FilingHistoryRow — design.md §8.2b, Figma Stage 3b: stamped-✓ left ·
 * "KIND · period" title + "{authority} · Filed {date}" caption · amount +
 * "Receipt" download at right · immutable (no edit affordances by
 * construction). Draft filings show a neutral status tag instead.
 */

import React from "react";
import { Download, FileText } from "lucide-react";
import dayjs from "dayjs";
import type { TaxFiling } from "@/models";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import StampedCheck from "./StampedCheck";
import Tag from "./Tag";

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
}) => {
  const accepted =
    filing.status === "accepted" || filing.status === "submitted";
  const filedAt =
    filing.filed_at && dayjs(filing.filed_at).isValid()
      ? dayjs(filing.filed_at).format("D MMM YYYY")
      : null;
  return (
    <div
      role="row"
      data-status={filing.status}
      className={cn(
        "flex items-center gap-3 border-b border-border px-3 py-2 text-[13px] text-text",
        className,
      )}
    >
      {accepted ? (
        <StampedCheck
          size="md"
          label={`${filing.kind} filed`}
          className="!h-6 !w-6 shrink-0"
        />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elev">
          <FileText aria-hidden className="h-3.5 w-3.5 text-text-2" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium uppercase leading-4">
          {filing.kind}
          <span className="normal-case text-text-2"> · {filing.period}</span>
        </span>
        <span className="block truncate leading-4 text-text-2">
          {filing.authority.code}
          {filing.authority.payment_channels[0]
            ? ` · ${filing.authority.payment_channels[0]}`
            : ""}
          {filedAt ? ` · Filed ${filedAt}` : ` · due ${filing.due_date}`}
        </span>
      </span>
      <span className="shrink-0 text-right font-medium tabular-nums">
        {formatMoney(filing.amount_due, currency)}
      </span>
      {accepted && filing.artifact_key ? (
        <button
          type="button"
          onClick={onDownloadReceipt}
          className="flex shrink-0 items-center gap-1 rounded p-1 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Download aria-hidden className="h-3.5 w-3.5" />
          Receipt
        </button>
      ) : !accepted ? (
        <Tag tint="neutral">{filing.status}</Tag>
      ) : null}
    </div>
  );
};

export default FilingHistoryRow;
