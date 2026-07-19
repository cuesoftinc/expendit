"use client";

/**
 * B6 `/dashboard/company` — Company financials, statements (pages.md B6):
 * upload balance sheet / income statement / cash flow (CSV/XLSX/PDF/image
 * through the shared dropzone) with kind + statement-grammar period;
 * "Enter manually" beside the dropzone (ManualStatementRow rows land
 * directly in staged review); statements list with mapping states and
 * the supersede audit trail. Mapping review + statement view live on the
 * drill-in (B6c / statement view).
 */

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { FileSpreadsheet, Plus } from "lucide-react";
import { useOrg, useStatementsController } from "@/controllers";
import { KEYS_BY_KIND, type CanonicalKey } from "@/models/registry/line-items";
import type { StatementKind } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import ManualStatementRow from "@/components/ui/ManualStatementRow";
import Modal from "@/components/ui/Modal";
import PeriodPicker from "@/components/ui/PeriodPicker";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Tag, { type TagTint } from "@/components/ui/Tag";
import UploadDropzone, {
  type UploadFileItem,
} from "@/components/ui/UploadDropzone";
import PageHeader from "../PageHeader";

const KIND_OPTIONS = [
  { value: "balance_sheet", label: "Balance sheet" },
  { value: "income_statement", label: "Income statement" },
  { value: "cash_flow", label: "Cash flow" },
];

const KIND_LABEL: Record<StatementKind, string> = {
  balance_sheet: "Balance sheet",
  income_statement: "Income statement",
  cash_flow: "Cash flow",
};

const STATUS_TINT: Record<string, TagTint> = {
  processing: "info",
  staged: "warn",
  confirmed: "success",
  failed: "error",
  superseded: "neutral",
};

interface ManualRow {
  id: number;
  key: CanonicalKey | null;
  amount: string;
}

export const CompanyStatementsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrg, activeOrgId } = useOrg();
  const statements = useStatementsController(activeOrgId);

  const [kind, setKind] = useState<StatementKind>("balance_sheet");
  const [period, setPeriod] = useState<string | null>("2026-Q2");
  const [uploads, setUploads] = useState<UploadFileItem[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { id: 1, key: null, amount: "" },
  ]);
  const [manualError, setManualError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const highlightUpload = searchParams.get("upload") === "1";
  const isCompany = activeOrg?.kind === "company";
  const keyOptions = KEYS_BY_KIND[kind];

  const sorted = useMemo(
    () =>
      [...statements.statements].sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1,
      ),
    [statements.statements],
  );

  const onFiles = (files: File[]) => {
    if (!period) return;
    for (const file of files) {
      const id = `${file.name}-${Date.now()}`;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const fileType =
        ext === "pdf" ? "pdf" : ["jpg", "jpeg", "png", "heic"].includes(ext) ? "image" : "csv";
      setUploads((prev) => [
        ...prev,
        { id, name: file.name, fileType, state: { phase: "progress", percent: 50 } },
      ]);
      void statements
        .upload(file, kind, period)
        .then((result) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, state: { phase: "ai-sweep" } } : item,
            ),
          );
          // The mapping poll (controller) flips to staged; route there.
          router.push(`/dashboard/company/statements/${result.statement_id}`);
        })
        .catch((err: unknown) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    state: {
                      phase: "error",
                      message:
                        err instanceof Error ? err.message : "Upload failed",
                    },
                  }
                : item,
            ),
          );
        });
    }
  };

  const submitManual = async () => {
    if (!period) return;
    const rows = manualRows.filter((row) => row.key && row.amount !== "");
    if (rows.length === 0) {
      setManualError("Add at least one line item.");
      return;
    }
    setBusy(true);
    setManualError(null);
    try {
      const result = await statements.enterManually({
        kind,
        period,
        currency: activeOrg?.currency ?? "NGN",
        line_items: rows.map((row) => ({
          canonical_key: row.key as CanonicalKey,
          amount: Number(row.amount),
        })),
      });
      setManualOpen(false);
      setManualRows([{ id: 1, key: null, amount: "" }]);
      router.push(`/dashboard/company/statements/${result.statement_id}`);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Entry failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Company statements"
        description="Upload or enter financial statements — AI maps lines to the canonical model, you confirm."
      />

      {!isCompany ? (
        <div className="mb-4">
          <Banner kind="info">
            Statements are captured on company orgs — switch to your company
            workspace (or create one) to upload financial statements.
          </Banner>
        </div>
      ) : null}

      {statements.error ? (
        <div className="mb-4">
          <Banner kind="error">{statements.error}</Banner>
        </div>
      ) : null}

      <section
        aria-label="Upload statement"
        className={`rounded border border-border bg-bg p-4 ${highlightUpload ? "ring-2 ring-accent ring-offset-2" : ""}`}
      >
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Select
            label="Statement kind"
            options={KIND_OPTIONS}
            value={kind}
            onValueChange={(value) => setKind(value as StatementKind)}
            className="w-48"
          />
          <PeriodPicker
            mode="quarter"
            label="Period"
            value={period}
            onValueChange={setPeriod}
            presets={[
              { label: "Q2 2026", value: "2026-Q2" },
              { label: "Q1 2026", value: "2026-Q1" },
              { label: "FY2025", value: "FY2025" },
            ]}
          />
          <Button
            kind="quiet"
            size="sm"
            disabled={!isCompany}
            onClick={() => setManualOpen(true)}
          >
            <Plus aria-hidden className="mr-1 inline h-3.5 w-3.5" />
            Enter manually
          </Button>
        </div>
        <UploadDropzone
          files={uploads}
          onFiles={onFiles}
          disabled={!isCompany || !period}
          accept=".csv,.xlsx,.pdf,.jpg,.jpeg,.png,.heic"
        />
        <p className="mt-2 text-[12px] text-text-2">
          Scanned or photographed statements go through the AI vision path —
          `ai_processing` consent applies.
        </p>
      </section>

      <section aria-label="Statements" className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium text-text">Statements</h2>
        {statements.loading && sorted.length === 0 ? (
          <div>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="row" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="rounded border border-border bg-bg px-4 py-6 text-center text-[13px] text-text-2">
            No statements yet — upload one above, or enter it manually.
            {isCompany ? "" : " (Company orgs only.)"}
          </p>
        ) : (
          <ul className="list-none rounded border border-border">
            {sorted.map((statement) => (
              <li key={statement.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/company/statements/${statement.id}`)
                  }
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] text-text transition-colors duration-fast ease-standard hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <FileSpreadsheet aria-hidden className="h-4 w-4 shrink-0 text-text-2" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium leading-4">
                      {KIND_LABEL[statement.kind]}
                      <span className="text-text-2"> · {statement.period}</span>
                    </span>
                    <span className="block truncate font-mono text-[11px] leading-4 text-text-2">
                      {statement.id}
                      {statement.superseded_by
                        ? ` · superseded by ${statement.superseded_by}`
                        : ""}
                    </span>
                  </span>
                  {statement.mapping_warnings.length > 0 ? (
                    <Tag tint="warn">{statement.mapping_warnings.length} warnings</Tag>
                  ) : null}
                  <Tag tint={STATUS_TINT[statement.mapping_status] ?? "neutral"}>
                    {statement.mapping_status}
                  </Tag>
                  <span className="w-20 shrink-0 text-right tabular-nums text-text-2">
                    {statement.confirmed_at
                      ? dayjs(statement.confirmed_at).format("D MMM")
                      : dayjs(statement.created_at).format("D MMM")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Manual entry — rows land directly in staged review */}
      <Modal
        open={manualOpen}
        onOpenChange={setManualOpen}
        title={`Enter ${KIND_LABEL[kind].toLowerCase()} manually`}
        description={`Period ${period ?? "—"} · ${activeOrg?.currency ?? "NGN"} · canonical keys only`}
        size="lg"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button kind="quiet" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void submitManual()}>
              Stage for review
            </Button>
          </div>
        }
      >
        <ul className="list-none">
          {manualRows.map((row) => (
            <ManualStatementRow
              key={row.id}
              keyOptions={keyOptions}
              canonicalKey={row.key}
              amount={row.amount}
              onKeyChange={(key) =>
                setManualRows((prev) =>
                  prev.map((item) =>
                    item.id === row.id ? { ...item, key } : item,
                  ),
                )
              }
              onAmountChange={(amount) =>
                setManualRows((prev) =>
                  prev.map((item) =>
                    item.id === row.id ? { ...item, amount } : item,
                  ),
                )
              }
              onRemove={
                manualRows.length > 1
                  ? () =>
                      setManualRows((prev) =>
                        prev.filter((item) => item.id !== row.id),
                      )
                  : undefined
              }
            />
          ))}
        </ul>
        <Button
          kind="quiet"
          size="sm"
          className="mt-2"
          onClick={() =>
            setManualRows((prev) => [
              ...prev,
              { id: Math.max(...prev.map((r) => r.id)) + 1, key: null, amount: "" },
            ])
          }
        >
          <Plus aria-hidden className="mr-1 inline h-3.5 w-3.5" />
          Add row
        </Button>
        {manualError ? (
          <p role="alert" className="mt-2 text-[13px] text-expense">
            {manualError}
          </p>
        ) : null}
      </Modal>
    </>
  );
};

export default CompanyStatementsView;
