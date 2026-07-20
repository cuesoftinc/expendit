"use client";

/**
 * B7b `/dashboard/taxes/file` — Filing wizard (pages.md B7, MI-10):
 * period → data review (traceable computed fields via "how we got this"
 * trace accordions; blocks on `tax_identity_incomplete` with a
 * complete-your-profile prompt) → generated documents incl. the
 * remittance sheet (the step that names the authority) → submission:
 * typed confirmation of the period arms the final CTA; success lands the
 * stamped-✓ + receipt download and an immutable filing-history record.
 * v1 scope: filing-ready documents + guided handoff.
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrg, useTaxController } from "@/controllers";
import { ApiError } from "@/models/repositories";
import { missingTaxIdentifiers } from "@/models/tax";
import type { TaxFiling, TaxKind } from "@/models";
import { formatMoney } from "@/lib/format";
import Accordion from "@/components/ui/Accordion";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PeriodPicker from "@/components/ui/PeriodPicker";
import Select from "@/components/ui/Select";
import StampedCheck from "@/components/ui/StampedCheck";
import WizardShell from "@/components/ui/WizardShell";
import WizardStep, { type WizardStepState } from "@/components/ui/WizardStep";
import PageHeader from "../../PageHeader";

type Step = 1 | 2 | 3 | 4;

const KIND_OPTIONS = [
  { value: "vat", label: "VAT — monthly summary" },
  { value: "pit", label: "Personal income tax (PIT)" },
  { value: "cit", label: "Company income tax (CIT)" },
];

/** Rail steps with sub-captions (Figma B7b 188:3855); step 3 = "Forms". */
const STEP_META = [
  { label: "Period", caption: "Choose what to file" },
  { label: "Data review", caption: "Traceable computed fields" },
  { label: "Forms", caption: "Generated filing forms" },
  { label: "Submit", caption: "Typed confirmation locks it" },
];

/** Human labels for the shared missing-identifier keys. */
const IDENTIFIER_LABELS: Record<string, string> = {
  tin: "TIN",
  rc_number: "RC number",
  registered_address: "registered address",
  state_of_residence: "state of residence",
};

const formatMissingIdentifiers = (missing: string[]): string => {
  const labels = missing.map((key) => IDENTIFIER_LABELS[key] ?? key);
  const joined =
    labels.length > 1
      ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`
      : (labels[0] ?? "profile identifiers");
  return `${joined} ${labels.length === 1 ? "is" : "are"}`;
};

/** Seeded complete periods per kind (mock period grammar). */
const DEFAULT_PERIOD: Record<TaxKind, string> = {
  vat: "2026-06",
  pit: "2025",
  cit: "FY2025",
};

const stepState = (
  index: number,
  current: Step,
  error?: boolean,
): WizardStepState => {
  const step = (index + 1) as Step;
  if (step === current) return error ? "error" : "current";
  return step < current ? "done" : "todo";
};

export const FilingWizardView: React.FC = () => {
  const router = useRouter();
  const { activeOrg, activeOrgId } = useOrg();
  const currency = activeOrg?.currency ?? "NGN";
  const tax = useTaxController(activeOrgId);

  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<TaxKind>("vat");
  const [period, setPeriod] = useState<string | null>("2026-06");
  const [kindTouched, setKindTouched] = useState(false);
  const [filing, setFiling] = useState<TaxFiling | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identityBlocked, setIdentityBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [done, setDone] = useState(false);

  // Default the filing kind to the org's shape once it resolves — an
  // individual workspace opened straight onto a VAT draft (system QA
  // 2026-07-19); PIT is the personal default, VAT the company one.
  useEffect(() => {
    if (kindTouched || step !== 1 || filing) return;
    if (activeOrg?.kind === "personal" && kind !== "pit") {
      // Defer to a microtask — effects must not set state synchronously.
      queueMicrotask(() => {
        setKind("pit");
        setPeriod(DEFAULT_PERIOD.pit);
      });
    }
  }, [activeOrg?.kind, kind, kindTouched, step, filing]);

  const start = async () => {
    if (!period) return;
    setBusy(true);
    setError(null);
    try {
      const draft = await tax.startFiling(kind, period);
      setFiling(draft);
      setStep(2);
    } catch (err) {
      if (err instanceof ApiError && err.code === "period_incomplete") {
        setError(`${err.message} — pick a period that has ended.`);
      } else {
        setError(err instanceof Error ? err.message : "Could not draft filing");
      }
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!filing) return;
    setBusy(true);
    setError(null);
    setIdentityBlocked(false);
    try {
      const generated = await tax.generateFiling(filing.id);
      setFiling(generated);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "tax_identity_incomplete") {
          setIdentityBlocked(true);
          setStep(2);
        } else if (err.code === "ruleset_unsigned") {
          setError(
            `${err.message}. This rule set stays estimate-only until a professional signs it off.`,
          );
        } else if (err.code === "mapping_unconfirmed") {
          setError(
            `${err.message}. Confirm the staged statement in Company → Statements first.`,
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Generation failed");
      }
    } finally {
      setBusy(false);
    }
  };

  // Review-step guards (system QA 2026-07-19): surface the profile gate
  // before the user walks three steps into a 422, and call out an
  // all-zero draft (e.g. VAT on a ledger with no vatable activity).
  // Same completeness predicate the generate endpoint enforces (Codex
  // review on PR #209) — requirements follow the taxpayer, not the
  // filing kind.
  const missingIdentifiers =
    filing && tax.profile ? missingTaxIdentifiers(tax.profile, activeOrg) : [];
  const profileIncomplete = missingIdentifiers.length > 0;
  const zeroActivity = filing
    ? filing.computed_fields.length > 0 &&
      filing.computed_fields.every((field) => field.value === 0)
    : false;

  const traceItems = (target: TaxFiling) =>
    target.computed_fields
      .filter((field) => field.key !== "remittance_sheet")
      .map((field) => ({
        id: field.key,
        title: (
          <span className="flex w-full items-center justify-between gap-3">
            <span>{field.label}</span>
            <span className="tabular-nums">
              {formatMoney(field.value, currency)}
            </span>
          </span>
        ),
        variant: "trace" as const,
        content: (
          <div className="space-y-1 font-mono text-[12px]">
            <p>{field.formula}</p>
            {field.inputs.length > 0 ? (
              <p className="text-text-2">inputs: {field.inputs.join(", ")}</p>
            ) : null}
            {field.notes.map((note) => (
              <p key={note} className="text-text-2">
                {note}
              </p>
            ))}
          </div>
        ),
      }));

  const downloadDocuments = () => {
    if (!filing) return;
    const lines = [
      `Expendit filing documents (mock) — ${filing.kind.toUpperCase()} ${filing.period}`,
      `Status: ${filing.status}`,
      "",
      "— Remittance sheet —",
      `Authority: ${filing.authority.name} (${filing.authority.code})`,
      `Amount due: ${formatMoney(filing.amount_due, currency)}`,
      `Period: ${filing.period}`,
      `Deadline: ${filing.due_date}`,
      `Payment channels: ${filing.authority.payment_channels.join(" / ")}`,
      "",
      ...filing.computed_fields.map(
        (field) => `${field.label}: ${field.value} (${field.formula})`,
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filing.kind}-${filing.period}-filing.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /** Reviewable computed lines (remittance sheet is a document, not a line). */
  const reviewFields = filing
    ? filing.computed_fields.filter((field) => field.key !== "remittance_sheet")
    : [];

  const steps = (
    <>
      {STEP_META.map((meta, index) => (
        <WizardStep
          key={meta.label}
          state={stepState(index, step, index === 1 && identityBlocked)}
          label={meta.label}
          caption={meta.caption}
          index={index + 1}
          orientation="vertical"
        />
      ))}
    </>
  );

  // Running summary (Figma B7b): Period + the computed lines
  // (Output/Input/Net for VAT) with the estimates footnote.
  const summary = filing ? (
    <>
      <dl className="space-y-2 text-[13px]">
        <div className="flex justify-between gap-2">
          <dt className="text-text-2">Period</dt>
          <dd className="tabular-nums">
            <span className="font-medium uppercase">{filing.kind}</span>{" "}
            {filing.period}
          </dd>
        </div>
        {reviewFields.map((field) => (
          <div key={field.key} className="flex justify-between gap-2">
            <dt className="min-w-0 truncate text-text-2">
              {field.label.split(" — ")[0]}
            </dt>
            <dd className="tabular-nums">
              {formatMoney(field.value, currency)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-border pt-2 text-[12px] leading-4 text-text-2">
        Estimates update as you review line items.
      </p>
    </>
  ) : (
    <p className="text-[13px] text-text-2">
      Draft a period to see the running summary.
    </p>
  );

  return (
    <>
      <PageHeader
        title="File taxes"
        description="v1 produces filing-ready documents with a guided handoff — direct e-filing lands with jurisdiction APIs."
      />

      {error ? (
        <div className="mb-4">
          <Banner kind="error">{error}</Banner>
        </div>
      ) : null}

      <WizardShell steps={steps} summary={summary}>
        {step === 1 ? (
          <section aria-label="Choose period" className="max-w-md space-y-4">
            <Select
              label="Filing"
              options={KIND_OPTIONS}
              value={kind}
              onValueChange={(value) => {
                setKindTouched(true);
                setKind(value as TaxKind);
                setPeriod(DEFAULT_PERIOD[value as TaxKind]);
              }}
            />
            {kind === "pit" ? (
              // PIT files a plain calendar tax year ("2025") — the
              // PeriodPicker year mode is the FY#### statement grammar,
              // which rejects it (Codex review on PR #209), so PIT gets
              // a year Select of ended years instead.
              <Select
                label="Period"
                options={[
                  { value: "2025", label: "2025" },
                  { value: "2024", label: "2024" },
                ]}
                value={period}
                onValueChange={setPeriod}
              />
            ) : (
              <PeriodPicker
                mode={kind === "vat" ? "month" : "year"}
                label="Period"
                value={period}
                onValueChange={setPeriod}
                presets={
                  kind === "vat"
                    ? [
                        { label: "June 2026", value: "2026-06" },
                        { label: "May 2026", value: "2026-05" },
                      ]
                    : [{ label: "FY2025", value: "FY2025" }]
                }
              />
            )}
            <Button
              loading={busy}
              disabled={!period}
              onClick={() => void start()}
            >
              Draft filing
            </Button>
          </section>
        ) : null}

        {step === 2 && filing ? (
          <section aria-label="Data review" className="space-y-4">
            {/* Step anatomy (Figma B7b): H2 + intro. */}
            <h2 className="text-sm font-semibold text-text">Data review</h2>
            {identityBlocked || profileIncomplete ? (
              <Banner
                kind="warn"
                action={
                  <Button
                    size="sm"
                    kind="quiet"
                    onClick={() => router.push("/dashboard/taxes")}
                  >
                    Complete tax profile
                  </Button>
                }
              >
                Complete your tax profile —{" "}
                {formatMissingIdentifiers(missingIdentifiers)} required before
                documents can be generated (tax_identity_incomplete).
              </Banner>
            ) : null}
            <p className="text-[13px] text-text-2">
              Every computed field carries its “how we got this” trace — the
              exact formula and inputs behind the figure.
            </p>
            {zeroActivity ? (
              <Banner kind="info">
                No {filing.kind.toUpperCase()} activity found for{" "}
                {filing.period} — every computed field is ₦0.00. Generating
                would produce an empty filing.
              </Banner>
            ) : null}
            {/* Figma B7b: FIRST accordion expanded, chevrons LEFT,
                amounts as a right-aligned column. */}
            <Accordion
              items={traceItems(filing)}
              chevron="left"
              defaultOpen={reviewFields[0] ? [reviewFields[0].key] : []}
            />
            <div className="flex gap-2">
              <Button kind="quiet" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue to forms</Button>
            </div>
          </section>
        ) : null}

        {step === 3 && filing ? (
          <section aria-label="Forms" className="space-y-4">
            <h2 className="text-sm font-semibold text-text">Forms</h2>
            <p className="text-[13px] text-text-2">
              Generating produces the filing forms and the remittance sheet —
              the authority is named before anything is final.
            </p>
            <div className="rounded border border-border bg-bg-elev p-4 text-[13px]">
              <h3 className="mb-2 font-medium text-text">
                Remittance sheet (preview)
              </h3>
              <dl className="space-y-1">
                <div className="flex justify-between gap-2">
                  <dt className="text-text-2">Remit to</dt>
                  <dd>
                    {filing.authority.name} ({filing.authority.code})
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-2">Amount due</dt>
                  <dd className="tabular-nums">
                    {formatMoney(filing.amount_due, currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-2">Deadline</dt>
                  <dd className="tabular-nums">{filing.due_date}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-2">Channels</dt>
                  <dd>{filing.authority.payment_channels.join(" / ")}</dd>
                </div>
              </dl>
            </div>
            <div className="flex gap-2">
              <Button kind="quiet" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>Continue to submit</Button>
            </div>
          </section>
        ) : null}

        {step === 4 && filing && !done ? (
          <section
            aria-label="Submit confirmation"
            className="max-w-md space-y-4"
          >
            <p className="text-[13px] leading-5 text-text-2">
              Generating locks this filing — documents are immutable once
              produced. Type the period{" "}
              <strong className="font-mono text-text">{filing.period}</strong>{" "}
              to confirm.
            </p>
            <Input
              label="Confirm period"
              name="confirm-period"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={filing.period}
            />
            <div className="flex gap-2">
              <Button kind="quiet" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                kind="destructive"
                disabled={confirmText !== filing.period}
                loading={busy}
                onClick={() => void generate()}
              >
                Generate filing documents
              </Button>
            </div>
          </section>
        ) : null}

        {done && filing ? (
          <section
            aria-label="Filing generated"
            className="flex max-w-md flex-col items-center gap-4 py-8 text-center"
          >
            <StampedCheck size="lg" label={`${filing.kind} filing generated`} />
            <div>
              <h2 className="text-sm font-medium text-text">
                {filing.kind.toUpperCase()} {filing.period} is filing-ready
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-text-2">
                Remit {formatMoney(filing.amount_due, currency)} to{" "}
                {filing.authority.name} via{" "}
                {filing.authority.payment_channels.join(" or ")} by{" "}
                {filing.due_date}. The record is now immutable in your filing
                history.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadDocuments}>Download documents</Button>
              <Button
                kind="quiet"
                onClick={() => router.push("/dashboard/taxes")}
              >
                Filing history
              </Button>
            </div>
          </section>
        ) : null}
      </WizardShell>
    </>
  );
};

export default FilingWizardView;
