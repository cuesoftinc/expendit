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
import dayjs from "dayjs";
import type { ImportJob } from "@/models";
import { cn } from "@/lib/cn";
import Tag from "./Tag";

export type ImportJobRowStatus =
  "processing" | "completed" | "completed-empty" | "completed-bank" | "failed";

/** Folded row status (design.md §8.2b as-built note). */
export const rowStatus = (job: ImportJob): ImportJobRowStatus => {
  if (job.status === "processing") return "processing";
  if (job.status === "failed") return "failed";
  if (job.source === "bank_sync") return "completed-bank";
  return job.total_parsed === 0 ? "completed-empty" : "completed";
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
      return job.error_code ?? "failed";
    case "completed-empty":
      return "0 transactions found — check file contents";
    case "completed-bank":
      return `${job.imported} transactions${job.confirmed ? " · auto-confirmed" : ""}`;
    case "completed": {
      const parts = [`${job.imported} transactions`];
      if (job.duplicates_found > 0)
        parts.push(`${job.duplicates_found} duplicates`);
      if (job.anomalies.length > 0)
        parts.push(`${job.anomalies.length} anomalies found`);
      return parts.join(" · ");
    }
  }
};

const STATUS_TAG: Record<
  ImportJobRowStatus,
  { label: string; tint: "info" | "success" | "neutral" | "error" }
> = {
  processing: { label: "Processing", tint: "info" },
  completed: { label: "Completed", tint: "success" },
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
    status === "completed-bank" ? Landmark : FILE_ICON[job.file_type ?? "csv"];
  const tag = STATUS_TAG[status];
  const when = dayjs(job.created_at).isValid()
    ? dayjs(job.created_at).format("D MMM")
    : job.created_at;
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
              status === "failed" ? "font-mono text-expense" : "text-text-2",
            )}
          >
            {caption(job, status)}
          </span>
        </span>
        <Tag tint={tag.tint}>{tag.label}</Tag>
        <span className="w-14 shrink-0 text-right tabular-nums text-text-2">
          {when}
        </span>
      </button>
    </li>
  );
};

export default ImportJobRow;
