/**
 * RemitToCard — design.md §8.2: tax pit/cit/vat · resolved authority
 * (State IRS e.g. LIRS / FIRS) + amount due + deadline + payment-channel
 * chips (tax-engine §"Remittance & authorities" registry).
 */

import React from "react";
import { Landmark } from "lucide-react";
import type { Authority, TaxKind } from "@/models";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

const TAX_LABEL: Record<TaxKind, string> = {
  pit: "Personal income tax",
  cit: "Company income tax",
  vat: "VAT",
};

export interface RemitToCardProps {
  kind: TaxKind;
  authority: Authority;
  amountDue: number;
  currency?: string;
  /** ISO due date, rendered as given. */
  dueDate: string;
  className?: string;
}

export const RemitToCard: React.FC<RemitToCardProps> = ({
  kind,
  authority,
  amountDue,
  currency = "NGN",
  dueDate,
  className,
}) => (
  <div
    data-kind={kind}
    className={cn("rounded border border-border bg-bg-elev p-4", className)}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="rounded border border-border bg-bg px-1.5 text-[11px] font-medium uppercase tracking-wide text-text-2">
        {TAX_LABEL[kind]}
      </span>
      <span className="text-[13px] tabular-nums text-text-2">
        due {dueDate}
      </span>
    </div>
    <div className="mt-3 flex items-center gap-2 text-sm text-text">
      <Landmark aria-hidden className="h-4 w-4 text-text-2" />
      <span className="font-medium">Remit to {authority.name}</span>
      <span className="font-mono text-[12px] text-text-2">
        ({authority.code})
      </span>
    </div>
    <div className="mt-1 text-2xl font-semibold tabular-nums text-text">
      {formatMoney(amountDue, currency)}
    </div>
    {authority.payment_channels.length > 0 ? (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {authority.payment_channels.map((channel) => (
          <span
            key={channel}
            className="rounded border border-info/40 bg-info/10 px-1.5 py-0 text-[11px] font-medium text-info"
          >
            {channel}
          </span>
        ))}
      </div>
    ) : null}
  </div>
);

export default RemitToCard;
