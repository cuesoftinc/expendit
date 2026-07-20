"use client";

/**
 * B5 `/dashboard/reports` — Reports & downloads (pages.md B5, EXP-004):
 * generate monthly summary / cash movement / category deep-dive
 * (+category) / financial statement (+kind, statement-grammar period);
 * format PDF/CSV; TTL'd artifact history with download (MI-14 — NEW tag
 * ≤24h computed here, inline generating progress in the row).
 */

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useCategoriesController,
  useOrg,
  useReportsController,
} from "@/controllers";
import type { ReportFormat, ReportKind, StatementKind } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import PeriodPicker from "@/components/ui/PeriodPicker";
import ProgressBar from "@/components/ui/ProgressBar";
import ReportArtifactRow, {
  humanPeriod,
} from "@/components/ui/ReportArtifactRow";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import { isArtifactNew } from "@/lib/artifact-new";
import PageHeader from "../PageHeader";
import ToastLayer from "../ToastLayer";

const KIND_OPTIONS = [
  { value: "monthly_summary", label: "Monthly summary" },
  { value: "cash_movement", label: "Cash movement" },
  { value: "category_deep_dive", label: "Category deep-dive" },
  { value: "financial_statement", label: "Financial statement" },
];

const KIND_LABELS: Record<ReportKind, string> = {
  monthly_summary: "Monthly summary",
  cash_movement: "Cash movement",
  category_deep_dive: "Category deep-dive",
  financial_statement: "Financial statement",
  full_export: "Full export",
};

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

  // Generating strip (Figma B5): in-flight artifacts render as a strip
  // above the history with a simulated determinate % (the mock carries
  // no progress signal; the strip parks near-done until it resolves).
  const generatingArtifacts = useMemo(
    () =>
      reports.artifacts.filter(
        (artifact) => artifact.status === "generating",
      ),
    [reports.artifacts],
  );
  const listedArtifacts = useMemo(
    () =>
      reports.artifacts.filter(
        (artifact) => artifact.status !== "generating",
      ),
    [reports.artifacts],
  );
  const [generatingPercent, setGeneratingPercent] = useState(12);
  useEffect(() => {
    if (generatingArtifacts.length === 0) return;
    const timer = setInterval(
      () =>
        setGeneratingPercent((prev) =>
          Math.min(95, prev + 3 + Math.ceil(Math.random() * 4)),
        ),
      900,
    );
    return () => clearInterval(timer);
  }, [generatingArtifacts.length]);

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

      {/* Inline generate toolbar (Figma B5 184:2933): [report select]
          [period][PDF·CSV segmented][Generate report] under the title. */}
      <section
        aria-label="Generate report"
        className={`flex flex-wrap items-center gap-2 ${highlight ? "rounded ring-2 ring-accent ring-offset-2" : ""}`}
      >
        <div className="w-52">
          <Select
            aria-label="Report"
            options={KIND_OPTIONS}
            value={kind}
            onValueChange={(value) => setKind(value as ReportKind)}
            size="sm"
          />
        </div>
        {kind === "category_deep_dive" ? (
          <div className="w-44">
            <Select
              aria-label="Category"
              options={categoryOptions}
              value={category}
              onValueChange={setCategory}
              placeholder="Pick a category"
              size="sm"
            />
          </div>
        ) : null}
        {kind === "financial_statement" ? (
          <>
            <div className="w-44">
              <Select
                aria-label="Statement"
                options={STATEMENT_KIND_OPTIONS}
                value={statementKind}
                onValueChange={(value) =>
                  setStatementKind(value as StatementKind)
                }
                size="sm"
              />
            </div>
            <div className="w-40">
              <PeriodPicker
                mode="year"
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
              value={period}
              onValueChange={setPeriod}
              presets={[
                { label: "June 2026", value: "2026-06" },
                { label: "May 2026", value: "2026-05" },
              ]}
            />
          </div>
        )}
        <SegmentedControl
          aria-label="Format"
          options={[
            { value: "pdf", label: "PDF" },
            { value: "csv", label: "CSV" },
          ]}
          value={format}
          onValueChange={(value) => setFormat(value as ReportFormat)}
        />
        <Button
          size="sm"
          loading={generating}
          disabled={
            !effectivePeriod || (kind === "category_deep_dive" && !category)
          }
          onClick={() => void generate()}
        >
          Generate report
        </Button>
      </section>

      {/* Generating strip (Figma B5): label + bar + "PDF · N%" above the
          history — in-flight artifacts leave the list for the strip. */}
      {generatingArtifacts.map((artifact) => (
        <section
          key={artifact.id}
          aria-label={`Generating ${KIND_LABELS[artifact.kind]}`}
          className="mt-6 rounded border border-border bg-bg p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2 text-[13px]">
            <span className="font-medium text-text">
              Generating {KIND_LABELS[artifact.kind]} —{" "}
              {humanPeriod(artifact.period)}
            </span>
            <span className="tabular-nums text-text-2">
              <span className="uppercase">{artifact.format}</span> ·{" "}
              {generatingPercent}%
            </span>
          </div>
          <ProgressBar size="sm" value={generatingPercent} />
        </section>
      ))}

      <section aria-label="Artifact history" className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium text-text">
          Artifact history
        </h2>
        {reports.loading && reports.artifacts.length === 0 ? (
          <div>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="row" />
            ))}
          </div>
        ) : listedArtifacts.length === 0 ? (
          <p className="rounded border border-border bg-bg px-4 py-6 text-center text-[13px] text-text-2">
            No reports yet — generate your first one above.
          </p>
        ) : (
          <ul className="list-none rounded border border-border">
            {listedArtifacts.map((artifact) => (
              <ReportArtifactRow
                key={artifact.id}
                artifact={artifact}
                // MI-14: NEW while ≤24h old (created ≥ now−24h — the
                // pure rule in lib/artifact-new, unit-tested; system QA
                // 2026-07-19 replaced the clock-skew |diff| hack).
                isNew={
                  artifact.status === "ready" &&
                  isArtifactNew(artifact.created_at)
                }
                onDownload={() => download(artifact.signed_url)}
              />
            ))}
          </ul>
        )}
        {/* Expiry reassurance (Figma B5 footer caption). */}
        <p className="mt-2 text-[12px] leading-4 text-text-2">
          Artifacts expire after 30 days. You can regenerate any report at any
          time.
        </p>
      </section>

      <ToastLayer message={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default ReportsView;
