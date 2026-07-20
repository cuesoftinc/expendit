"use client";

/**
 * B3b `/dashboard/imports/{job_id}` — staged review (pages.md B3): AI
 * categories ✨ with per-row fix (MI-4), duplicates pre-flagged and
 * excluded from the confirm count (re-includable, flows/import.md §4),
 * StagedReviewHeader counts + commit (MI-3) / discard, warnings banner.
 * B3c: a `failed` job renders the failure-taxonomy error screen + retry.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import {
  useCategoriesController,
  useImportsController,
  useOrg,
} from "@/controllers";
import type { StagedTransaction, TxnEntry } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import StagedReviewHeader from "@/components/ui/StagedReviewHeader";
import TableHeader from "@/components/ui/TableHeader";
import Tag from "@/components/ui/Tag";
import TxnTableRow from "@/components/ui/TxnTableRow";
import { failureMessage } from "../ImportsView";
import PageHeader from "../../PageHeader";
import ToastLayer from "../../ToastLayer";

// Registry default category color — data, not styling.
const FALLBACK_CATEGORY_COLOR = "#6E6E76";

/** Staged rows render through the ledger row (single ingestion look). */
const toTxnShape = (row: StagedTransaction, orgId: string): TxnEntry => ({
  id: row.id,
  org_id: orgId,
  description: row.description,
  amount: row.amount,
  direction: row.direction,
  category_id: row.category_id,
  txn_date: row.txn_date,
  source: "csv",
  source_link_id: null,
  ai_categorized: row.ai_categorized,
  excluded_from_reports: false,
  anomalies: [],
  created_at: row.txn_date,
});

export const JobDetailView: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const { activeOrgId } = useOrg();
  const imports = useImportsController(activeOrgId);
  const { items: categories } = useCategoriesController(activeOrgId);
  const [committing, setCommitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    kind: "info" | "error";
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId || !jobId) return;
    queueMicrotask(() => {
      void imports
        .openJob(jobId)
        .then((detail) => {
          if (detail.job.status === "processing") imports.pollJob(jobId);
        })
        .catch((err: unknown) =>
          setLoadError(err instanceof Error ? err.message : "Job not found"),
        );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, jobId]);

  const job = imports.activeJob;
  const staged = imports.staged;

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
      })),
    [categories],
  );
  const categoryById = useMemo(
    () => new Map(categoryOptions.map((cat) => [cat.id, cat])),
    [categoryOptions],
  );

  const importCount = staged.filter(
    (row) => !row.is_duplicate || row.include_duplicate,
  ).length;
  const duplicateCount = staged.length - importCount;

  const confirm = async () => {
    if (!job) return;
    setCommitting(true);
    try {
      const result = await imports.confirm(job.id);
      router.push(`/dashboard/transactions?imported=${result.imported}`);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Confirm failed",
        kind: "error",
      });
      setCommitting(false);
    }
  };

  const discard = async () => {
    if (!job) return;
    await imports.discard(job.id);
    router.push("/dashboard/imports");
  };

  /**
   * B3b "Discard N duplicates": flags every duplicate for discard —
   * resets explicit re-includes; the commit performs the actual discard
   * (flows/import.md §2, duplicates excluded unless re-included).
   */
  const discardDuplicates = async () => {
    const reIncluded = staged.filter(
      (row) => row.is_duplicate && row.include_duplicate,
    );
    for (const row of reIncluded) {
      await imports.setIncludeDuplicate(row.id, false);
    }
    const flagged = staged.filter((row) => row.is_duplicate).length;
    setToast({
      message: `${flagged} ${flagged === 1 ? "duplicate" : "duplicates"} flagged for discard — recoverable for 30 days after import.`,
      kind: "info",
    });
  };

  if (loadError) {
    return (
      <>
        <PageHeader title="Import" />
        <Banner kind="error">{loadError}</Banner>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <PageHeader title="Import" />
        <div>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="row" />
          ))}
        </div>
      </>
    );
  }

  const title =
    job.file_name ?? (job.source === "bank_sync" ? "Bank sync" : "Upload");

  // B3c — failure taxonomy screen (flows/import.md §3).
  if (job.status === "failed") {
    return (
      <>
        <PageHeader title={title} />
        <section
          aria-label="Import failed"
          className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded border border-border bg-bg px-6 py-8 text-center"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-expense/10">
            <CircleAlert aria-hidden className="h-4 w-4 text-expense" />
          </span>
          <div>
            <h2 className="text-sm font-medium text-text">Import failed</h2>
            <p className="mt-1 text-[13px] leading-4 text-text-2">
              {failureMessage(job.error_code)}
            </p>
            {job.error_code ? (
              <p className="mt-2 font-mono text-[11px] text-text-2">
                {job.error_code}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/imports?upload=1")}
            >
              Retry with a new upload
            </Button>
            <Button kind="quiet" size="sm" onClick={() => void discard()}>
              Remove job
            </Button>
          </div>
        </section>
      </>
    );
  }

  if (job.status === "processing") {
    return (
      <>
        <PageHeader
          title={title}
          description="Processing — AI is categorizing your rows."
        />
        <div>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} variant="row" />
          ))}
        </div>
      </>
    );
  }

  // completed-empty (no_transactions_found UX).
  if (staged.length === 0 && !job.confirmed) {
    return (
      <>
        <PageHeader title={title} />
        <section
          aria-label="Nothing to review"
          className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded border border-border bg-bg px-6 py-8 text-center"
        >
          <h2 className="text-sm font-medium text-text">
            No transactions found
          </h2>
          <p className="text-[13px] leading-4 text-text-2">
            {job.file_type === "csv"
              ? "The CSV headers were not recognized — try a CSV export straight from your bank."
              : job.file_type === "pdf"
                ? "No transaction text found in the PDF — try a CSV export from your bank."
                : "This image does not look like a receipt — try a clearer photo or a CSV export."}
          </p>
          <Button
            size="sm"
            onClick={() => router.push("/dashboard/imports?upload=1")}
          >
            Upload another file
          </Button>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/dashboard/imports"
          className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text"
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          Imports
        </Link>
      </div>
      <PageHeader
        title={title}
        description={job.ai_summary ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {job.anomalies.length > 0 ? (
              <Tag tint="warn" size="md">
                {job.anomalies.length}{" "}
                {job.anomalies.length === 1 ? "anomaly" : "anomalies"} found
              </Tag>
            ) : null}
            {/* Whole-job abort — demoted out of the review band (the B3b
                frame's band carries only the discard-dupes/import pair). */}
            <Button kind="quiet" size="sm" onClick={() => void discard()}>
              Discard import
            </Button>
          </div>
        }
      />

      <StagedReviewHeader
        importCount={importCount}
        duplicateCount={duplicateCount}
        state={committing ? "committing" : "reviewing"}
        onCommit={() => void confirm()}
        onDiscardDuplicates={() => void discardDuplicates()}
        warnings={
          job.warnings.length > 0 ? (
            <Banner kind="warn">{job.warnings.join(" · ")}</Banner>
          ) : undefined
        }
      />

      {/* Mobile canon: below lg the staged table scrolls horizontally
          inside this container — the page never side-scrolls. */}
      <section
        aria-label="Staged transactions"
        className="mt-3 max-lg:overflow-x-auto"
      >
        <table className="w-full border-separate border-spacing-0">
          <TableHeader
            sticky
            columns={[
              { id: "date", label: "Date", widthClass: "w-14" },
              { id: "source", label: "", widthClass: "w-4" },
              { id: "description", label: "Description" },
              { id: "category", label: "Category", widthClass: "w-40" },
              {
                id: "amount",
                label: "Amount",
                numeric: true,
                widthClass: "w-32",
              },
            ]}
          />
          <tbody className="contents">
            {staged.map((row) => {
              const excludedDuplicate =
                row.is_duplicate && !row.include_duplicate;
              return (
                <TxnTableRow
                  key={row.id}
                  txn={toTxnShape(row, activeOrgId ?? "")}
                  category={
                    categoryById.get(row.category_id) ?? {
                      id: row.category_id,
                      name: row.category_id,
                      color: FALLBACK_CATEGORY_COLOR,
                    }
                  }
                  categoryOptions={categoryOptions}
                  stagedDuplicate={excludedDuplicate}
                  // Duplicates: the row checkbox re-includes false positives
                  // (flows/import.md §4); non-duplicates always import and
                  // stay visually default (Figma staged-review frame).
                  selected={row.is_duplicate && row.include_duplicate}
                  onSelectedChange={
                    row.is_duplicate
                      ? (next) => void imports.setIncludeDuplicate(row.id, next)
                      : undefined
                  }
                  onCategorySelect={(categoryId) =>
                    void imports.correctCategory(row.id, categoryId)
                  }
                />
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Reassurance footer (B3b frame): the 30-day recoverability is a
          trust promise — same copy family as the Reports expiry caption. */}
      <p className="mt-3 text-[12px] text-text-2">
        {importCount} {importCount === 1 ? "row" : "rows"} will join your
        ledger.
        {duplicateCount > 0
          ? " Discarded duplicates stay recoverable for 30 days."
          : ""}
      </p>

      <ToastLayer
        message={toast?.message ?? null}
        kind={toast?.kind ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </>
  );
};

export default JobDetailView;
