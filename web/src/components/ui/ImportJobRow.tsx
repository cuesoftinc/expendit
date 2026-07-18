/**
 * ImportJobRow — design.md §8.2b: status processing / completed /
 * completed-empty / completed-bank / failed · counts + anomalies-found.
 * As built the source axis folds into status (completed-bank =
 * bank_sync; processing/failed render as upload-source).
 */

import React from "react";
import {
  CircleAlert,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Landmark,
} from "lucide-react";
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
  return (
    <button
      type="button"
      role="row"
      data-status={status}
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-[13px] text-text",
        "transition-colors duration-fast ease-standard hover:bg-bg-elev",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
        className,
      )}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
      <span className="min-w-0 flex-1 truncate">
        {job.file_name ?? (job.source === "bank_sync" ? "Bank sync" : "Upload")}
      </span>

      {status === "processing" ? (
        <span className="inline-flex items-center gap-1.5 text-text-2">
          <span
            aria-hidden
            className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-accent motion-reduce:animate-none"
          />
          Processing…
        </span>
      ) : status === "failed" ? (
        <span className="inline-flex items-center gap-1 text-expense">
          <CircleAlert aria-hidden className="h-3.5 w-3.5" />
          <span className="font-mono text-[12px]">
            {job.error_code ?? "failed"}
          </span>
        </span>
      ) : status === "completed-empty" ? (
        <span className="text-text-2">No transactions found</span>
      ) : (
        <>
          <span className="tabular-nums text-text-2">
            {job.imported}/{job.total_parsed} imported
          </span>
          {job.duplicates_found > 0 ? (
            <span className="tabular-nums text-text-2">
              {job.duplicates_found} duplicates
            </span>
          ) : null}
          {job.anomalies.length > 0 ? (
            <Tag tint="warn" count={job.anomalies.length} />
          ) : null}
          {status === "completed-bank" ? <Tag tint="info">bank</Tag> : null}
        </>
      )}
      <span className="w-20 shrink-0 text-right tabular-nums text-text-2">
        {job.created_at.slice(0, 10)}
      </span>
    </button>
  );
};

export default ImportJobRow;
