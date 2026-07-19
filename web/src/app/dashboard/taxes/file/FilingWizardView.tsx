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

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrg, useTaxController } from "@/controllers";
import { ApiError } from "@/models/repositories";
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

const STEP_LABELS = ["Period", "Data review", "Documents", "Submit"];

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
  const [filing, setFiling] = useState<TaxFiling | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identityBlocked, setIdentityBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [done, setDone] = useState(false);

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

  const steps = (
    <>
      {STEP_LABELS.map((label, index) => (
        <WizardStep
          key={label}
          state={stepState(index, step, index === 1 && identityBlocked)}
          label={label}
          index={index + 1}
          orientation="vertical"
        />
      ))}
    </>
  );

  const summary = filing ? (
    <dl className="space-y-2 text-[13px]">
      <div className="flex justify-between gap-2">
        <dt className="text-text-2">Filing</dt>
        <dd className="font-medium uppercase">{filing.kind}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-text-2">Period</dt>
        <dd className="tabular-nums">{filing.period}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-text-2">Amount due</dt>
        <dd className="tabular-nums">
          {formatMoney(filing.amount_due, currency)}
        </dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-text-2">Authority</dt>
        <dd>{filing.authority.code}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-text-2">Deadline</dt>
        <dd className="tabular-nums">{filing.due_date}</dd>
      </div>
    </dl>
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
                setKind(value as TaxKind);
                setPeriod(value === "vat" ? "2026-06" : "FY2025");
              }}
            />
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
            {identityBlocked ? (
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
                Complete your tax profile — TIN
                {filing.kind === "cit" ? " and RC number" : ""} are required
                before documents can be generated (tax_identity_incomplete).
              </Banner>
            ) : null}
            <p className="text-[13px] text-text-2">
              Every computed field carries its “how we got this” trace — the
              exact formula and inputs behind the figure (MI-10).
            </p>
            <Accordion items={traceItems(filing)} />
            <div className="flex gap-2">
              <Button kind="quiet" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Looks right — continue</Button>
            </div>
          </section>
        ) : null}

        {step === 3 && filing ? (
          <section aria-label="Documents" className="space-y-4">
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
