"use client";

/**
 * B3 `/dashboard/imports` — Import hub (pages.md B3): UploadDropzone
 * (CSV/PDF/receipt image, MI-2 lifecycle: progress → AI-sweep → ✓ row
 * count / error taxonomy) + import-job history (status, counts, anomalies
 * found). Jobs open the staged-review detail (B3b). Render-only.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useImportsController, useOrg } from "@/controllers";
import { ApiError } from "@/models/repositories";
import type { ImportFileType } from "@/models";
import Banner from "@/components/ui/Banner";
import EmptyState from "@/components/ui/EmptyState";
import ImportJobRow from "@/components/ui/ImportJobRow";
import Skeleton from "@/components/ui/Skeleton";
import UploadDropzone, {
  type UploadFileItem,
} from "@/components/ui/UploadDropzone";
import PageHeader from "../PageHeader";

const ACCEPT = ".csv,.xlsx,.txt,.pdf,.jpg,.jpeg,.png,.webp,.heic";

const EXT_TO_TYPE: Record<string, ImportFileType> = {
  csv: "csv",
  xlsx: "csv",
  txt: "csv",
  pdf: "pdf",
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  heic: "image",
};

/** Failure-taxonomy copy (flows/import.md §3) — every code, distinct UX. */
export const FAILURE_COPY: Record<string, string> = {
  file_too_large: "Files must be 15 MB or smaller.",
  unsupported_type: "Upload a CSV, PDF, or receipt image.",
  no_transactions_found:
    "No transactions found — try a CSV export from your bank.",
  password_protected_pdf: "Remove the password and re-upload.",
  ai_unavailable:
    "AI processing is temporarily unavailable — try again later. CSV imports are unaffected.",
  consent_required:
    "AI processing consent is needed for images — review it in Settings → Data & privacy.",
};

export const failureMessage = (code: string | null): string =>
  (code && FAILURE_COPY[code]) ??
  "Something went wrong — nothing was imported.";

export const ImportsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrgId } = useOrg();
  const imports = useImportsController(activeOrgId);

  const [uploads, setUploads] = useState<UploadFileItem[]>([]);
  const [uploadJobs, setUploadJobs] = useState<Record<string, string>>({});
  const highlightUpload = searchParams.get("upload") === "1";

  // MI-2 lifecycle sync: as the controller polls jobs, per-file chips
  // advance progress → AI-sweep → complete (row count) / error.
  useEffect(() => {
    // Defer to a microtask — effects must not set state synchronously.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setUploads((prev) =>
        prev.map((item) => {
          const jobId = uploadJobs[item.id];
          if (!jobId) return item;
          const job =
            imports.jobs.find((candidate) => candidate.id === jobId) ??
            (imports.activeJob?.id === jobId ? imports.activeJob : undefined);
          if (!job) return item;
          if (job.status === "processing") {
            return item.state.phase === "ai-sweep"
              ? item
              : { ...item, state: { phase: "ai-sweep" } };
          }
          if (job.status === "failed") {
            return {
              ...item,
              state: {
                phase: "error",
                message: failureMessage(job.error_code),
              },
            };
          }
          return item.state.phase === "complete"
            ? item
            : {
                ...item,
                state: { phase: "complete", rowCount: job.total_parsed },
              };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [imports.jobs, imports.activeJob, uploadJobs]);

  const onFiles = (files: File[]) => {
    for (const file of files) {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const fileType = EXT_TO_TYPE[ext] ?? "csv";
      setUploads((prev) => [
        ...prev,
        {
          id,
          name: file.name,
          fileType,
          state: { phase: "progress", percent: 45 },
        },
      ]);
      void imports
        .upload(file)
        .then((jobId) => {
          setUploadJobs((prev) => ({ ...prev, [id]: jobId }));
          setUploads((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, state: { phase: "ai-sweep" } } : item,
            ),
          );
        })
        .catch((err: unknown) => {
          const message =
            err instanceof ApiError
              ? failureMessage(err.code)
              : "Upload failed — try again.";
          setUploads((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, state: { phase: "error", message } }
                : item,
            ),
          );
        });
    }
  };

  const sortedJobs = useMemo(
    () =>
      [...imports.jobs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [imports.jobs],
  );

  return (
    <>
      <PageHeader
        title="Imports"
        description="Drop statements or receipts — AI stages every row for your review before anything lands in the ledger."
      />

      {imports.error ? (
        <div className="mb-4">
          <Banner kind="error">{imports.error}</Banner>
        </div>
      ) : null}

      <section aria-label="Upload">
        <UploadDropzone
          files={uploads}
          onFiles={onFiles}
          accept={ACCEPT}
          className={
            highlightUpload ? "ring-2 ring-accent ring-offset-2" : undefined
          }
        />
      </section>

      <section aria-label="Import history" className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium text-text">History</h2>
        {imports.loading && sortedJobs.length === 0 ? (
          <div>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="row" />
            ))}
          </div>
        ) : sortedJobs.length === 0 ? (
          <EmptyState kind="imports" className="mx-auto mt-8 max-w-md" />
        ) : (
          <ul className="list-none rounded border border-border">
            {sortedJobs.map((job) => (
              <ImportJobRow
                key={job.id}
                job={job}
                onOpen={() => router.push(`/dashboard/imports/${job.id}`)}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export default ImportsView;
