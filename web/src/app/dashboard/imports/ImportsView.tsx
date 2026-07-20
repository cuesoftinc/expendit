"use client";

/**
 * B3 `/dashboard/imports` — Import hub (pages.md B3): UploadDropzone
 * (CSV/PDF/receipt image, MI-2 lifecycle: progress → AI-sweep → ✓ row
 * count / error taxonomy) + import-job history (status, counts, anomalies
 * found). Jobs open the staged-review detail (B3b). Render-only.
 */

import React, { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Upload } from "lucide-react";
import { useImportsController, useOrg } from "@/controllers";
import { ApiError } from "@/models/repositories";
import { failureMessage } from "@/lib/import-failures";
import type { ImportFileType } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
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

  // Post-parse summary card (Figma B3 183:855): the freshest parsed job
  // still parked in staged review sits beside the dropzone with its
  // counts and the "Review import" hand-off.
  const reviewableJob = useMemo(
    () =>
      sortedJobs.find(
        (job) =>
          job.status === "completed" && !job.confirmed && job.total_parsed > 0,
      ),
    [sortedJobs],
  );

  const uploadInputId = useId();

  return (
    <>
      <PageHeader
        title="Imports"
        description="Drop statements or receipts — AI stages every row for your review before anything lands in the ledger."
        actions={
          // Header primary (Figma B3 frame) — opens the file picker.
          <Button
            size="sm"
            onClick={() => document.getElementById(uploadInputId)?.click()}
          >
            <Upload aria-hidden className="mr-1 inline h-3.5 w-3.5" />
            Upload statement
          </Button>
        }
      />

      {imports.error ? (
        <div className="mb-4">
          <Banner kind="error">{imports.error}</Banner>
        </div>
      ) : null}

      {/* Top band (Figma B3): dropzone + post-parse summary side by side. */}
      <div
        className={
          reviewableJob ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : undefined
        }
      >
        <section aria-label="Upload">
          <UploadDropzone
            files={uploads}
            onFiles={onFiles}
            accept={ACCEPT}
            inputId={uploadInputId}
            className={
              highlightUpload ? "ring-2 ring-accent ring-offset-2" : undefined
            }
          />
        </section>

        {reviewableJob ? (
          <section
            aria-label="Parsed statement summary"
            className="flex flex-col items-start justify-center gap-2 rounded border border-border bg-bg px-6 py-6"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full bg-income/10"
              >
                <Check className="h-4 w-4 text-income" />
              </span>
              <span className="text-sm font-medium text-text">
                {reviewableJob.total_parsed} transaction
                {reviewableJob.total_parsed === 1 ? "" : "s"} found
              </span>
            </span>
            <p className="text-[13px] leading-4 text-text-2">
              {reviewableJob.total_parsed - reviewableJob.duplicates_found}{" "}
              ready
              {reviewableJob.duplicates_found > 0
                ? ` · ${reviewableJob.duplicates_found} possible duplicate${
                    reviewableJob.duplicates_found === 1 ? "" : "s"
                  } flagged`
                : ""}
            </p>
            <Button
              size="sm"
              onClick={() =>
                router.push(`/dashboard/imports/${reviewableJob.id}`)
              }
            >
              Review import
            </Button>
          </section>
        ) : null}
      </div>

      <section aria-label="Import history" className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium text-text">
          Import history
        </h2>
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
