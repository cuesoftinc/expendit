/**
 * ReportArtifactRow — design.md §8.2b: kind icon + name + period +
 * format · state generating (inline progress) / ready / NEW (≤24h,
 * MI-14) / expired (TTL).
 */

import React from "react";
import {
  ArrowLeftRight,
  Banknote,
  Download,
  FileArchive,
  FileChartColumn,
  Tag as TagIcon,
} from "lucide-react";
import type { ReportArtifact, ReportKind } from "@/models";
import { cn } from "@/lib/cn";
import ProgressBar from "./ProgressBar";
import Tag from "./Tag";

const KIND_META: Record<
  ReportKind,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  monthly_summary: { label: "Monthly summary", Icon: FileChartColumn },
  cash_movement: { label: "Cash movement", Icon: ArrowLeftRight },
  category_deep_dive: { label: "Category deep-dive", Icon: TagIcon },
  financial_statement: { label: "Financial statement", Icon: Banknote },
  full_export: { label: "Full export", Icon: FileArchive },
};

export interface ReportArtifactRowProps {
  artifact: ReportArtifact;
  /** NEW tag while the artifact is ≤24h old (MI-14) — computed by caller. */
  isNew?: boolean;
  onDownload?: () => void;
  className?: string;
}

export const ReportArtifactRow: React.FC<ReportArtifactRowProps> = ({
  artifact,
  isNew = false,
  onDownload,
  className,
}) => {
  const { label, Icon } = KIND_META[artifact.kind];
  const state =
    artifact.status === "generating"
      ? "generating"
      : artifact.status === "expired"
        ? "expired"
        : isNew
          ? "new"
          : "ready";
  return (
    // Semantic list row (W3 directive): the artifact history composes <ul>.
    <li
      data-state={state}
      className={cn(
        "flex items-center gap-3 border-b border-border px-3 py-2 text-[13px] text-text",
        state === "expired" && "opacity-60",
        className,
      )}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span className="w-20 shrink-0 tabular-nums text-text-2">
        {artifact.period}
      </span>
      <span className="w-12 shrink-0 font-mono text-[11px] uppercase text-text-2">
        {artifact.format}
      </span>
      {state === "generating" ? (
        <span className="w-32 shrink-0" data-testid="artifact-progress">
          <ProgressBar size="sm" />
        </span>
      ) : state === "expired" ? (
        <Tag tint="neutral">Expired</Tag>
      ) : (
        <>
          {state === "new" ? <Tag tint="new-accent">NEW</Tag> : null}
          <button
            type="button"
            aria-label={`Download ${label}`}
            onClick={onDownload}
            className="rounded p-1.5 text-text-2 transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Download className="h-4 w-4" />
          </button>
        </>
      )}
    </li>
  );
};

export default ReportArtifactRow;
