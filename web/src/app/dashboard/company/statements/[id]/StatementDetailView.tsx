"use client";

/**
 * B6c `/dashboard/company/statements/{id}` — statement drill-in:
 * mapping review while staged (MappingReviewRow: AI ✨ + per-row
 * confidence, low-confidence rows arrive unmapped; ManualStatementRow
 * add-row for parser-missed lines; confirm runs derivations + the
 * identity check → 422 mapping_identity_violation /
 * unmapped_threshold_exceeded) — and the confirmed StatementView
 * (canonical + derived rows, mapping-warning badges, period header,
 * export to report artifact). flows/statement-mapping.md.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import {
  useOrg,
  useReportsController,
  useStatementsController,
} from "@/controllers";
import { ApiError } from "@/models/repositories";
import {
  DERIVATIONS,
  KEYS_BY_KIND,
  type CanonicalKey,
} from "@/models/registry/line-items";
import type { MappingRow } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import ManualStatementRow from "@/components/ui/ManualStatementRow";
import MappingReviewRow from "@/components/ui/MappingReviewRow";
import Skeleton from "@/components/ui/Skeleton";
import StatementView from "@/components/ui/StatementView";
import PageHeader from "../../../PageHeader";
import ToastLayer from "../../../ToastLayer";

const KIND_LABEL = {
  balance_sheet: "Balance sheet",
  income_statement: "Income statement",
  cash_flow: "Cash flow",
} as const;

/** Derived-key formula notes for the StatementView "(derived)" rows. */
const FORMULA_NOTES: Record<string, string> = Object.fromEntries(
  DERIVATIONS.map((derivation) => [derivation.key, derivation.formula]),
);

export const StatementDetailView: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const statementId = params.id;
  const { activeOrgId } = useOrg();
  const statements = useStatementsController(activeOrgId);
  const reports = useReportsController(activeOrgId);

  const [addRow, setAddRow] = useState<{
    key: CanonicalKey | null;
    amount: string;
  } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId || !statementId) return;
    queueMicrotask(() => {
      void statements
        .openMapping(statementId)
        .then((detail) => {
          if (detail.statement.mapping_status === "processing") {
            statements.pollMapping(statementId);
          }
        })
        .catch((err: unknown) =>
          setLoadError(
            err instanceof Error ? err.message : "Statement not found",
          ),
        );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, statementId]);

  const statement = statements.activeStatement;
  const lineItems = statements.lineItems;

  const mappingRows: MappingRow[] = useMemo(
    () =>
      lineItems
        .filter((item) => !item.derived)
        .map((item) => ({
          line_item_id: item.id,
          source_label: item.source_label,
          canonical_key: item.canonical_key,
          amount: item.amount,
          confidence: item.confidence,
          state:
            item.status === "unmapped"
              ? "unmapped"
              : item.mapped_by === "user"
                ? "confirmed"
                : "suggested",
        })),
    [lineItems],
  );

  if (loadError) {
    return (
      <>
        <PageHeader title="Statement" />
        <Banner kind="error">{loadError}</Banner>
      </>
    );
  }

  if (!statement || statement.id !== statementId) {
    return (
      <>
        <PageHeader title="Statement" />
        <div>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="row" />
          ))}
        </div>
      </>
    );
  }

  const keyOptions = KEYS_BY_KIND[statement.kind];
  const title = `${KIND_LABEL[statement.kind]} · ${statement.period}`;

  const back = (
    <div className="mb-4">
      <Link
        href="/dashboard/company"
        className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        Statements
      </Link>
    </div>
  );

  if (statement.mapping_status === "processing") {
    return (
      <>
        {back}
        <PageHeader
          title={title}
          description="Parsing — AI is suggesting canonical mappings."
        />
        <div>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="row" />
          ))}
        </div>
      </>
    );
  }

  if (statement.mapping_status === "failed") {
    return (
      <>
        {back}
        <PageHeader title={title} />
        <Banner kind="error">
          Parsing failed — re-upload the statement or enter it manually.
        </Banner>
      </>
    );
  }

  // Confirmed (or superseded) → the normalized StatementView.
  if (
    statement.mapping_status === "confirmed" ||
    statement.mapping_status === "superseded"
  ) {
    return (
      <>
        {back}
        <PageHeader title={title} />
        {statement.mapping_status === "superseded" ? (
          <div className="mb-3">
            <Banner kind="info">
              This statement was superseded by a newer confirmation for the same
              period
              {statement.superseded_by ? ` (${statement.superseded_by})` : ""}.
            </Banner>
          </div>
        ) : null}
        <StatementView
          kind={statement.kind}
          period={statement.period}
          currency={statement.currency}
          lineItems={lineItems}
          mappingWarnings={statement.mapping_warnings}
          formulaNotes={FORMULA_NOTES}
          // Export lives in the card header (Figma 98:743).
          headerActions={
            <Button
              size="sm"
              loading={busy}
              onClick={() => {
                setBusy(true);
                void reports
                  .generate({
                    kind: "financial_statement",
                    period: statement.period,
                    format: "pdf",
                    statement_kind: statement.kind,
                  })
                  .then(() =>
                    setToast("Report artifact generated — see Reports."),
                  )
                  .catch((err: unknown) =>
                    setToast(
                      err instanceof Error ? err.message : "Export failed",
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Export to report
            </Button>
          }
        />
        <ToastLayer message={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  // Staged → mapping review (B6c).
  const unmappedCount = mappingRows.filter(
    (row) => row.state === "unmapped",
  ).length;

  const confirm = async () => {
    setBusy(true);
    setConfirmError(null);
    try {
      await statements.confirm(statement.id);
      setToast("Statement confirmed — ratios recomputed for the period.");
    } catch (err) {
      if (err instanceof ApiError) {
        setConfirmError(
          err.code === "mapping_identity_violation"
            ? `Identity check failed: ${err.message}`
            : err.code === "unmapped_threshold_exceeded"
              ? `Too much unmapped value: ${err.message}`
              : err.message,
        );
      } else {
        setConfirmError(err instanceof Error ? err.message : "Confirm failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {back}
      <PageHeader
        title={`Review mapping — ${title}`}
        description="AI-suggested canonical keys with per-row confidence; rows under 60% arrive unmapped, never guessed."
        actions={
          <Button loading={busy} onClick={() => void confirm()}>
            Confirm mapping
          </Button>
        }
      />

      {unmappedCount > 0 ? (
        <div className="mb-3">
          <Banner kind="warn">
            {unmappedCount} row{unmappedCount === 1 ? "" : "s"} unmapped —
            parked rows are excluded from ratios.
          </Banner>
        </div>
      ) : null}

      {confirmError ? (
        <div className="mb-3">
          <Banner kind="error">{confirmError}</Banner>
        </div>
      ) : null}

      {/* Mobile canon: the mapping grid scrolls inside its container
          below lg — the page itself never side-scrolls. */}
      <section aria-label="Mapping review" className="max-lg:overflow-x-auto">
        <ul className="min-w-[560px] list-none rounded border border-border">
          {mappingRows.map((row) => (
            <MappingReviewRow
              key={row.line_item_id}
              row={row}
              keyOptions={keyOptions}
              currency={statement.currency}
              onKeyChange={(key) =>
                void statements.patchMapping(statement.id, {
                  updates: [
                    { line_item_id: row.line_item_id, canonical_key: key },
                  ],
                })
              }
              onConfirm={() =>
                void statements.patchMapping(statement.id, {
                  updates: [
                    {
                      line_item_id: row.line_item_id,
                      canonical_key: row.canonical_key,
                    },
                  ],
                })
              }
            />
          ))}
        </ul>
      </section>

      {/* Parser-missed rows are addable in review (MI-2/3 reuse) */}
      <section aria-label="Add missing rows" className="mt-3">
        {addRow ? (
          <div className="flex items-end gap-2">
            <ul className="min-w-0 flex-1 list-none">
              <ManualStatementRow
                keyOptions={keyOptions}
                canonicalKey={addRow.key}
                amount={addRow.amount}
                onKeyChange={(key) =>
                  setAddRow((prev) => prev && { ...prev, key })
                }
                onAmountChange={(amount) =>
                  setAddRow((prev) => prev && { ...prev, amount })
                }
                onRemove={() => setAddRow(null)}
              />
            </ul>
            <Button
              size="sm"
              disabled={!addRow.key || addRow.amount === ""}
              onClick={() => {
                if (!addRow.key) return;
                void statements
                  .patchMapping(statement.id, {
                    additions: [
                      {
                        canonical_key: addRow.key,
                        amount: Number(addRow.amount),
                      },
                    ],
                  })
                  .then(() => {
                    setAddRow(null);
                    setToast("Row added — counts toward the identity check.");
                  });
              }}
            >
              Stage added rows
            </Button>
          </div>
        ) : (
          <Button
            kind="quiet"
            size="sm"
            onClick={() => setAddRow({ key: null, amount: "" })}
          >
            <Plus aria-hidden className="mr-1 inline h-3.5 w-3.5" />
            Add row
          </Button>
        )}
      </section>

      <ToastLayer
        message={toast}
        action={
          <button
            type="button"
            className="font-medium text-accent"
            onClick={() => router.push("/dashboard/company/ratios")}
          >
            View ratios
          </button>
        }
        onDismiss={() => setToast(null)}
      />
    </>
  );
};

export default StatementDetailView;
