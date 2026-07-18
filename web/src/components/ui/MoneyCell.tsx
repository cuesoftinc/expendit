/**
 * MoneyCell — design.md §3/§8.2: amount + direction color + currency;
 * never colored for zero; direction encoded with sign + icon, never color
 * alone (§5); tabular numerals; size table / stat.
 */

import React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

export interface MoneyCellProps {
  amount: number;
  direction: "income" | "expense" | "zero";
  currency?: string;
  size?: "table" | "stat";
  /** Direction icon (kept for accessibility; hide via prop when dense). */
  withIcon?: boolean;
  className?: string;
}

export const MoneyCell: React.FC<MoneyCellProps> = ({
  amount,
  direction,
  currency = "NGN",
  size = "table",
  withIcon = true,
  className,
}) => {
  const sign =
    direction === "income" ? "+" : direction === "expense" ? "−" : "";
  const Icon = direction === "income" ? ArrowUpRight : ArrowDownLeft;
  return (
    <span
      data-direction={direction}
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        size === "table" ? "text-[13px]" : "text-2xl font-semibold",
        direction === "income" && "text-income",
        direction === "expense" && "text-expense",
        direction === "zero" && "text-text", // never colored for zero
        className,
      )}
    >
      {withIcon && direction !== "zero" ? (
        <Icon
          aria-hidden
          className={size === "table" ? "h-3.5 w-3.5" : "h-5 w-5"}
        />
      ) : null}
      <span>
        {sign}
        {formatMoney(Math.abs(amount), currency)}
      </span>
    </span>
  );
};

export default MoneyCell;
