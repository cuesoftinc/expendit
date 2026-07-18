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
  /**
   * Optional direction arrow. The Figma kit renders MoneyCell with sign
   * only (+/− already encodes direction without color); arrows are an
   * opt-in for call sites that want the extra cue.
   */
  withIcon?: boolean;
  className?: string;
}

export const MoneyCell: React.FC<MoneyCellProps> = ({
  amount,
  direction,
  currency = "NGN",
  size = "table",
  withIcon = false,
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
        // Figma: table = Table/13 Medium; stat = Display/32 Bold (-1px).
        size === "table"
          ? "text-[13px] font-medium leading-4"
          : "text-[32px] font-bold leading-[38px] tracking-[-1px]",
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
