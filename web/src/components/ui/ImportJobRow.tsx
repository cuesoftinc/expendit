/**
 * ImportJobRow — design.md §8.2b, Figma Stage 3b: file icon · filename
 * title + caption line · status Tag (Processing info / Completed success /
 * Empty neutral / Failed error) · timestamp. As built the source axis
 * folds into status (completed-bank = bank_sync; processing/failed render
 * as upload-source).
 */

import React from "react";
import {
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Landmark,
} from "lucide-react";
import { formatRelativeAge } from "@/lib/dates";
import { failureMessage } from "@/lib/import-failures";
import type { ImportJob } from "@/models";
import { cn } from "@/lib/cn";
import Tag from "./Tag";

export type ImportJobRowStatus =
  | "processing"
  | "completed"
  | "completed-empty"
  | "completed-bank"
  | "failed"
  | "needs-review";

/** Folded row status (design.md §8.2b as-built note). */
export const rowStatus = (job: ImportJob): ImportJobRowStatus => {
  if (job.status === "processing") return "processing";
  if (job.status === "failed") return "failed";
  if (job.total_parsed === 0 && job.source !== "bank_sync")
    return "completed-empty";
  // Parked in staged review (parse done, nothing committed): the green
  // "Completed · 0 transactions" read as an empty import (system QA
  // 2026-07-19) — surface the review call-to-action instead. Applies to
  // bank syncs too — they ride the same staged pipeline (pages.md B4).
  if (!job.confirmed && job.total_parsed > 0) return "needs-review";
  return job.source === "bank_sync" ? "completed-bank" : "completed";
};

const FILE_ICON = {
  csv: FileSpreadsheet,
  pdf: FileText,
  image: ImageIcon,
} as const;

/** Figma caption line per status. */
const caption = (job: ImportJob, status: ImportJobRowStatus): string => {
  switch (status) {
    case "processing":
      return "Parsing…";
    case "failed":
      // Human line (Figma B3) — the raw code rides the title tooltip.
      return failureMessage(job.error_code);
    case "completed-empty":
      return "0 transactions found — check file contents";
    case "needs-review": {
      const staged = `${job.total_parsed} staged for review`;
      return job.duplicates_found > 0
        ? `${staged} · ${job.duplicates_found} ${
            job.duplicates_found === 1 ? "duplicate" : "duplicates"
          } flagged`
        : staged;
    }
    case "completed-bank":
      return `${job.imported} ${
        job.imported === 1 ? "transaction" : "transactions"
      }${job.confirmed ? " · auto-confirmed" : ""}`;
    case "completed": {
      const parts = [
        `${job.imported} ${job.imported === 1 ? "transaction" : "transactions"}`,
      ];
      if (job.duplicates_found > 0)
        parts.push(
          `${job.duplicates_found} ${
            job.duplicates_found === 1 ? "duplicate" : "duplicates"
          }`,
        );
      if (job.anomalies.length > 0)
        parts.push(
          `${job.anomalies.length} ${
            job.anomalies.length === 1 ? "anomaly" : "anomalies"
          } found`,
        );
      return parts.join(" · ");
    }
  }
};

const STATUS_TAG: Record<
  ImportJobRowStatus,
  { label: string; tint: "info" | "success" | "neutral" | "error" | "warn" }
> = {
  processing: { label: "Processing", tint: "info" },
  completed: { label: "Completed", tint: "success" },
  // Figma ImportJobRow 127:1238: blue "Ready for review".
  "needs-review": { label: "Ready for review", tint: "info" },
  "completed-bank": { label: "Completed", tint: "success" },
  "completed-empty": { label: "Empty", tint: "neutral" },
  failed: { label: "Failed", tint: "error" },
};

export interface ImportJobRowProps {
  job: ImportJob;
  onOpen?: () => void;
  className?: string;
}

export const ImportJobRow: React.FC<ImportJobRowProps> = ({
  job,
  onOpen,
  className,
}) => {
  const status = rowStatus(job);
  const Icon =
    job.source === "bank_sync" ? Landmark : FILE_ICON[job.file_type ?? "csv"];
  const tag = STATUS_TAG[status];
  // Relative age ("2h ago") — systemic adjudication 2026-07-20.
  const when = formatRelativeAge(job.created_at);
  return (
    // Semantic list row (W3 directive): job history composes <ul>; the
    // whole-row action is a real <button> inside the <li>.
    <li className={cn("list-none", className)}>
      <button
        type="button"
        data-status={status}
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-[13px] text-text",
          "transition-colors duration-fast ease-standard hover:bg-bg-elev",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
        )}
      >
        <Icon aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium leading-4">
            {job.file_name ??
              (job.source === "bank_sync" ? "Bank sync" : "Upload")}
          </span>
          <span
            className={cn(
              "block truncate leading-4",
              status === "failed" ? "text-expense" : "text-text-2",
            )}
            title={
              status === "failed" && job.error_code ? job.error_code : undefined
            }
          >
            {caption(job, status)}
          </span>
        </span>
        <Tag tint={tag.tint}>{tag.label}</Tag>
        <span className="w-16 shrink-0 text-right tabular-nums text-text-2">
          {when}
        </span>
      </button>
    </li>
  );
};

export default ImportJobRow;
