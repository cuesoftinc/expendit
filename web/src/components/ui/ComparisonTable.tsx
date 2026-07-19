/**
 * ComparisonTable — design.md §8.2b: 2 columns (Cloud vs Self-host) ·
 * cell check / x / text · per-column CTA footer row. As built 2026-07-18
 * the price row reads "Announced at GA" / "Free forever", captioned
 * "Cloud pricing is announced at GA — self-hosting is free forever" —
 * the whole pricing story (marketing-accuracy note).
 */

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ComparisonCell =
  { kind: "check" } | { kind: "x" } | { kind: "text"; text: string };

export interface ComparisonRow {
  feature: string;
  cloud: ComparisonCell;
  selfHost: ComparisonCell;
}

export interface ComparisonTableProps {
  rows: ComparisonRow[];
  cloudCta?: React.ReactNode;
  selfHostCta?: React.ReactNode;
  caption?: string;
  className?: string;
}

const Cell: React.FC<{ cell: ComparisonCell }> = ({ cell }) => {
  if (cell.kind === "check") {
    return (
      <Check aria-label="Included" className="mx-auto h-4 w-4 text-income" />
    );
  }
  if (cell.kind === "x") {
    return (
      <X aria-label="Not included" className="mx-auto h-4 w-4 text-text-2" />
    );
  }
  // Single line always: on the 390 comparison the price row wrapped and
  // mis-baselined against its neighbor (system QA 2026-07-19).
  return (
    <span className="whitespace-nowrap text-[13px] text-text">{cell.text}</span>
  );
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  rows,
  cloudCta,
  selfHostCta,
  caption = "Cloud pricing is announced at GA — self-hosting is free forever",
  className,
}) => (
  <table className={cn("w-full border-collapse", className)}>
    <caption className="caption-bottom pt-3 text-[13px] text-text-2">
      {caption}
    </caption>
    <thead>
      <tr className="border-b border-border">
        <th
          scope="col"
          className="w-1/2 py-3 text-left text-[13px] font-medium text-text-2"
        >
          Feature
        </th>
        <th
          scope="col"
          className="py-3 text-center text-sm font-semibold text-text"
        >
          Cloud
        </th>
        <th
          scope="col"
          className="py-3 text-center text-sm font-semibold text-text"
        >
          Self-host
        </th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.feature} className="border-b border-border">
          <th
            scope="row"
            className="py-2.5 text-left text-[13px] font-normal text-text"
          >
            {row.feature}
          </th>
          <td className="py-2.5 text-center align-middle">
            <Cell cell={row.cloud} />
          </td>
          <td className="py-2.5 text-center align-middle">
            <Cell cell={row.selfHost} />
          </td>
        </tr>
      ))}
    </tbody>
    {cloudCta || selfHostCta ? (
      <tfoot>
        <tr>
          <td className="py-3" />
          <td className="py-3 text-center align-middle">{cloudCta}</td>
          <td className="py-3 text-center align-middle">{selfHostCta}</td>
        </tr>
      </tfoot>
    ) : null}
  </table>
);

export default ComparisonTable;
