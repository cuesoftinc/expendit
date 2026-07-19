/**
 * Donut legend with share + amount readouts (Figma A5/B1 embed legend:
 * dot · label · percent · mono tabular amount). Slice colors are data
 * (registry category colors), same as Chart/Donut.
 */

import React from "react";
import type { DemoDonutSlice } from "@/mock/demo";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

export const DonutLegend: React.FC<{
  slices: DemoDonutSlice[];
  className?: string;
}> = ({ slices, className }) => {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  return (
    <ul className={cn("space-y-1.5", className)}>
      {slices.map((slice) => (
        <li
          key={slice.id}
          className="flex items-center gap-2 text-[13px] leading-4"
        >
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: slice.color }}
          />
          <span className="min-w-0 flex-1 truncate text-text">
            {slice.label}
          </span>
          <span className="tabular-nums text-text-2">
            {Math.round((slice.value / total) * 100)}%
          </span>
          <span className="font-mono text-[12px] tabular-nums text-text">
            {formatMoney(slice.value)}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default DonutLegend;
