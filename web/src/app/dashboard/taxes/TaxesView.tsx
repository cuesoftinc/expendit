"use client";

/**
 * B7 `/dashboard/taxes` — Tax center (pages.md B7): jurisdiction profile
 * (state of residence resolves the State IRS for PIT; TIN/RC for company
 * orgs), tax calendar with MI-13 deadline banners (T-30/T-7/T-1, dismiss
 * snoozes), estimated liabilities as RemitToCards (resolved authority +
 * amount + deadline + channel), filing history (immutable, stamped
 * receipts), and the filing-wizard entry.
 */

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatIso, daysUntil } from "@/lib/dates";
import { useOrg, useTaxController } from "@/controllers";
import type { TaxCalendarEntry, TaxProfile } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FilingHistoryRow from "@/components/ui/FilingHistoryRow";
import FormRow from "@/components/ui/FormRow";
import Input from "@/components/ui/Input";
import RemitToCard from "@/components/ui/RemitToCard";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import TaxCalendarRow from "@/components/ui/TaxCalendarRow";
import PageHeader from "../PageHeader";
import ToastLayer from "../ToastLayer";

const NG_STATES = [
  { value: "NG-LA", label: "Lagos (LIRS)" },
  { value: "NG-FC", label: "Abuja FCT" },
  { value: "NG-RI", label: "Rivers" },
  { value: "NG-KN", label: "Kano" },
  { value: "NG-OY", label: "Oyo" },
];

export const TaxesView: React.FC = () => {
  const router = useRouter();
  const { activeOrg, activeOrgId } = useOrg();
  const currency = activeOrg?.currency ?? "NGN";
  const tax = useTaxController(activeOrgId);

  const [draft, setDraft] = useState<Partial<TaxProfile> | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [snoozedBanner, setSnoozedBanner] = useState(false);

  const profile = tax.profile;
  const isCompany = profile?.taxpayer_kind === "company";
  const identityMissing = profile
    ? isCompany
      ? !profile.tin || !profile.rc_number
      : !profile.tin || !profile.state_of_residence
    : false;

  // Calendar entries come from the estimates (kind/period/due/authority).
  const calendar: Array<TaxCalendarEntry & { daysToDue: number }> = useMemo(
    () =>
      tax.estimates
        .map((estimate) => ({
          kind: estimate.kind,
          period: estimate.period,
          due_date: estimate.due_date,
          authority: estimate.authority,
          daysToDue: daysUntil(estimate.due_date),
        }))
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [tax.estimates],
  );

  // MI-13: the nearest deadline surfaces as a banner at T-30/T-7/T-1.
  const nearest = calendar.find(
    (entry) => entry.daysToDue >= 0 && entry.daysToDue <= 30,
  );

  const saveProfile = async () => {
    if (!draft) return;
    setSavingProfile(true);
    try {
      await tax.updateProfile(draft);
      setDraft(null);
      setToast("Tax profile updated");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Profile update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  if (tax.loading && !profile) {
    return (
      <>
        <PageHeader title="Taxes" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="stat" />
          ))}
        </div>
      </>
    );
  }

  if (!tax.loading && !profile) {
    return (
      <>
        <PageHeader title="Taxes" />
        {tax.error ? (
          <div className="mb-4">
            <Banner kind="error">{tax.error}</Banner>
          </div>
        ) : null}
        <EmptyState kind="tax" className="mx-auto mt-16 max-w-md" />
      </>
    );
  }

  const values = { ...profile, ...(draft ?? {}) } as TaxProfile;

  return (
    <>
      <PageHeader
        title="Tax center"
        description="NG-first estimates with named authorities — every figure traceable to its inputs."
        actions={
          <Button
            size="sm"
            onClick={() => router.push("/dashboard/taxes/file")}
          >
            Start a filing
          </Button>
        }
      />

      {tax.error ? (
        <div className="mb-4">
          <Banner kind="error">{tax.error}</Banner>
        </div>
      ) : null}

      {nearest && !snoozedBanner ? (
        <div className="mb-4">
          <Banner
            kind={nearest.daysToDue <= 7 ? "warn" : "info"}
            onDismiss={() => setSnoozedBanner(true)}
            action={
              <Button
                size="sm"
                kind="quiet"
                onClick={() => router.push("/dashboard/taxes/file")}
              >
                File now
              </Button>
            }
          >
            {nearest.kind.toUpperCase()} {nearest.period} is due{" "}
            {formatIso(nearest.due_date, "d MMM")} (T-
            {nearest.daysToDue}) — remit to {nearest.authority.code}.
          </Banner>
        </div>
      ) : null}

      {identityMissing ? (
        <div className="mb-4">
          <Banner kind="warn">
            Your tax profile is incomplete —{" "}
            {isCompany ? "TIN and RC number" : "TIN and state of residence"} are
            required before filings can be generated (tax_identity_incomplete).
          </Banner>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,1.4fr]">
        {/* Jurisdiction profile */}
        <section
          aria-label="Tax profile"
          className="rounded border border-border bg-bg p-4"
        >
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-text">
              Jurisdiction profile · NG
            </h2>
            {draft ? (
              <div className="flex gap-2">
                <Button kind="quiet" size="sm" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  loading={savingProfile}
                  onClick={() => void saveProfile()}
                >
                  Save
                </Button>
              </div>
            ) : (
              <Button kind="quiet" size="sm" onClick={() => setDraft({})}>
                Edit
              </Button>
            )}
          </header>
          <div className="space-y-3">
            <FormRow label="Taxpayer">
              {() => (
                <p className="text-[13px] text-text">
                  {isCompany ? "Company (CIT · VAT)" : "Individual (PIT)"}
                </p>
              )}
            </FormRow>
            <FormRow label="TIN" required>
              {(id) =>
                draft ? (
                  <Input
                    id={id}
                    value={values.tin ?? ""}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, tin: event.target.value }))
                    }
                    placeholder="Tax identification number"
                  />
                ) : (
                  <p className="font-mono text-[13px] text-text">
                    {values.tin ?? (
                      <span className="text-warn-text">missing</span>
                    )}
                  </p>
                )
              }
            </FormRow>
            {isCompany ? (
              <FormRow label="RC number" required>
                {(id) =>
                  draft ? (
                    <Input
                      id={id}
                      value={values.rc_number ?? ""}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          rc_number: event.target.value,
                        }))
                      }
                      placeholder="CAC registration number"
                    />
                  ) : (
                    <p className="font-mono text-[13px] text-text">
                      {values.rc_number ?? (
                        <span className="text-warn-text">missing</span>
                      )}
                    </p>
                  )
                }
              </FormRow>
            ) : (
              <FormRow
                label="State of residence"
                helper="Determines your State IRS for PIT."
                required
              >
                {() =>
                  draft ? (
                    <Select
                      options={NG_STATES}
                      value={values.state_of_residence}
                      onValueChange={(value) =>
                        setDraft((prev) => ({
                          ...prev,
                          state_of_residence: value,
                        }))
                      }
                      placeholder="Select state"
                    />
                  ) : (
                    <p className="text-[13px] text-text">
                      {NG_STATES.find(
                        (state) => state.value === values.state_of_residence,
                      )?.label ?? (
                        <span className="text-warn-text">missing</span>
                      )}
                    </p>
                  )
                }
              </FormRow>
            )}
          </div>
        </section>

        {/* Calendar */}
        <section aria-label="Tax calendar">
          <h2 className="mb-2 text-[13px] font-medium text-text">
            Filing calendar
          </h2>
          {calendar.length === 0 ? (
            <p className="rounded border border-border bg-bg px-4 py-6 text-center text-[13px] text-text-2">
              No upcoming deadlines computed yet.
            </p>
          ) : (
            <ul className="list-none space-y-2">
              {calendar.map((entry) => (
                <TaxCalendarRow
                  key={`${entry.kind}-${entry.period}`}
                  entry={entry}
                  daysToDue={entry.daysToDue}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Estimates with remit-to authorities */}
      <section aria-label="Estimated liabilities" className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium text-text">
          Estimated liabilities
        </h2>
        {tax.estimates.length === 0 ? (
          <p className="rounded border border-border bg-bg px-4 py-6 text-center text-[13px] text-text-2">
            No estimates yet — they compute from your categorized ledger and
            confirmed statements.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tax.estimates.map((estimate) => (
                <RemitToCard
                  key={estimate.id}
                  kind={estimate.kind}
                  authority={estimate.authority}
                  amountDue={estimate.amount_due}
                  currency={currency}
                  dueDate={estimate.due_date}
                  daysToDue={daysUntil(estimate.due_date)}
                />
              ))}
            </div>
            {tax.estimates.flatMap((estimate) => estimate.banners).length >
            0 ? (
              <div className="mt-3 space-y-2">
                {[
                  ...new Set(
                    tax.estimates.flatMap((estimate) => estimate.banners),
                  ),
                ].map((note) => (
                  <Banner key={note} kind="info">
                    {note}
                  </Banner>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Filing history — immutable records */}
      <section aria-label="Filing history" className="mt-6">
        <h2 className="mb-2 text-[13px] font-medium text-text">
          Filing history
        </h2>
        {tax.filings.length === 0 ? (
          <p className="rounded border border-border bg-bg px-4 py-6 text-center text-[13px] text-text-2">
            No filings yet — start one from the wizard.
          </p>
        ) : (
          <ul className="list-none rounded border border-border">
            {tax.filings.map((filing) => (
              <FilingHistoryRow
                key={filing.id}
                filing={filing}
                currency={currency}
                onDownloadReceipt={() => {
                  const lines = [
                    `Expendit filing receipt (mock)`,
                    `${filing.kind.toUpperCase()} ${filing.period} — ${filing.status}`,
                    `Authority: ${filing.authority.name} (${filing.authority.code})`,
                    `Amount due: ${filing.amount_due}`,
                    `Due date: ${filing.due_date}`,
                  ];
                  const url = URL.createObjectURL(
                    new Blob([lines.join("\n")], { type: "text/plain" }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${filing.kind}-${filing.period}-receipt.txt`;
                  link.click();
                  URL.revokeObjectURL(url);
                  setToast("Receipt downloaded");
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <ToastLayer message={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default TaxesView;
