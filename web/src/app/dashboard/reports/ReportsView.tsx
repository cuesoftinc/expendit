"use client";

/**
 * B5 `/dashboard/reports` — Reports & downloads (pages.md B5, EXP-004):
 * generate monthly summary / cash movement / category deep-dive
 * (+category) / financial statement (+kind, statement-grammar period);
 * format PDF/CSV; TTL'd artifact history with download (MI-14 — NEW tag
 * ≤24h computed here, inline generating progress in the row).
 */

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import {
  useCategoriesController,
  useOrg,
  useReportsController,
} from "@/controllers";
import type { ReportFormat, ReportKind, StatementKind } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import PeriodPicker from "@/components/ui/PeriodPicker";
import Radio from "@/components/ui/Radio";
import ReportArtifactRow from "@/components/ui/ReportArtifactRow";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "../PageHeader";
import ToastLayer from "../ToastLayer";

const KIND_OPTIONS = [
  { value: "monthly_summary", label: "Monthly summary" },
  { value: "cash_movement", label: "Cash movement" },
  { value: "category_deep_dive", label: "Category deep-dive" },
  { value: "financial_statement", label: "Financial statement" },
];

const STATEMENT_KIND_OPTIONS = [
  { value: "balance_sheet", label: "Balance sheet" },
  { value: "income_statement", label: "Income statement" },
  { value: "cash_flow", label: "Cash flow" },
];

export const ReportsView: React.FC = () => {
  const searchParams = useSearchParams();
  const { activeOrgId } = useOrg();
  const reports = useReportsController(activeOrgId);
  const { items: categories } = useCategoriesController(activeOrgId);

  const [kind, setKind] = useState<ReportKind>("monthly_summary");
  const [period, setPeriod] = useState<string | null>("2026-06");
  const [statementPeriod, setStatementPeriod] = useState<string | null>(
    "FY2025",
  );
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [category, setCategory] = useState<string | null>(null);
  const [statementKind, setStatementKind] =
    useState<StatementKind>("balance_sheet");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ value: cat.id, label: cat.name })),
    [categories],
  );

  const effectivePeriod =
    kind === "financial_statement" ? statementPeriod : period;

  const generate = async () => {
    if (!effectivePeriod) return;
    setGenerating(true);
    setError(null);
    try {
      await reports.generate({
        kind,
        period: effectivePeriod,
        format,
        ...(kind === "category_deep_dive" && category ? { category } : {}),
        ...(kind === "financial_statement"
          ? { statement_kind: statementKind }
          : {}),
      });
      setToast("Report generated — find it in the history below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const download = (url: string | null) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = "";
    link.click();
    setToast("Download started");
  };

  const highlight = searchParams.get("generate") === "1";

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate downloadable artifacts — 30-day retention, signed links."
      />

      {reports.error || error ? (
        <div className="mb-4">
          <Banner kind="error">{reports.error ?? error}</Banner>
        </div>
      ) : null}

      <section
        aria-label="Generate report"
        className={`rounded border border-border bg-bg p-4 ${highlight ? "ring-2 ring-accent ring-offset-2" : ""}`}
      >
        <h2 className="mb-3 text-[13px] font-medium text-text">Generate</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-52">
            <Select
              label="Report"
              options={KIND_OPTIONS}
              value={kind}
              onValueChange={(value) => setKind(value as ReportKind)}
            />
          </div>
          {kind === "category_deep_dive" ? (
            <div className="w-44">
              <Select
                label="Category"
                options={categoryOptions}
                value={category}
                onValueChange={setCategory}
                placeholder="Pick a category"
              />
            </div>
          ) : null}
          {kind === "financial_statement" ? (
            <>
              <div className="w-44">
                <Select
                  label="Statement"
                  options={STATEMENT_KIND_OPTIONS}
                  value={statementKind}
                  onValueChange={(value) =>
                    setStatementKind(value as StatementKind)
                  }
                />
              </div>
              <div className="w-40">
                <PeriodPicker
                  mode="year"
                  label="Period"
                  value={statementPeriod}
                  onValueChange={setStatementPeriod}
                  presets={[
                    { label: "FY2025", value: "FY2025" },
                    { label: "FY2024", value: "FY2024" },
                  ]}
                />
              </div>
            </>
          ) : (
            <div className="w-40">
              <PeriodPicker
                mode="month"
                label="Period"
                value={period}
                onValueChange={setPeriod}
                presets={[
                  { label: "June 2026", value: "2026-06" },
                  { label: "May 2026", value: "2026-05" },
                ]}
              />
            </div>
          )}
          <fieldset>
            <legend className="mb-1 block text-[13px] font-medium text-text">
              Format
            </legend>
            <Radio
              name="report-format"
              value={format}
              onValueChange={(value) => setFormat(value as ReportFormat)}
              options={[
                { value: "pdf", label: "PDF" },
                { value: "csv", label: "CSV" },
              ]}
            />
          </fieldset>
          <Button
            loading={generating}
            disabled={
              !effectivePeriod || (kind === "category_deep_dive" && !category)
            }
            onClick={() => void generate()}
          >
            Generate
          </Button>
        </div>
      </section>

      <section aria-label="Artifact history" className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium text-text">History</h2>
        {reports.loading && reports.artifacts.length === 0 ? (
          <div>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="row" />
            ))}
          </div>
        ) : reports.artifacts.length === 0 ? (
          <p className="rounded border border-border bg-bg px-4 py-6 text-center text-[13px] text-text-2">
            No reports yet — generate your first one above.
          </p>
        ) : (
          <ul className="list-none rounded border border-border">
            {reports.artifacts.map((artifact) => (
              <ReportArtifactRow
                key={artifact.id}
                artifact={artifact}
                // MI-14: NEW while ≤24h old (|diff| absorbs the seed's
                // pinned mock clock vs the real clock).
                isNew={
                  artifact.status === "ready" &&
                  Math.abs(dayjs().diff(dayjs(artifact.created_at), "hour")) <=
                    24
                }
                onDownload={() => download(artifact.signed_url)}
              />
            ))}
          </ul>
        )}
      </section>

      <ToastLayer message={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default ReportsView;
