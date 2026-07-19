"use client";

/**
 * B4 `/dashboard/accounts` — Linked bank accounts (pages.md B4):
 * LinkAccountCard grid, "Link account" CTA → the MI-9 journey (connect →
 * consent (Mono widget hand-off) → syncing (progress + live txn counter)
 * → done), per-account sync schedule / last sync / txn count /
 * pause / auto-confirm / unlink (keep-or-purge), re-auth banners.
 * Synced batches land in the staged-review pipeline (single ingestion).
 */

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, Plus, RefreshCw } from "lucide-react";
import { useAccountsController, useOrg } from "@/controllers";
import { importsRepo, ApiError } from "@/models/repositories";
import type { BankLink } from "@/models";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import LinkAccountCard from "@/components/ui/LinkAccountCard";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import Radio from "@/components/ui/Radio";
import Skeleton from "@/components/ui/Skeleton";
import Switch from "@/components/ui/Switch";
import WizardStep, { type WizardStepState } from "@/components/ui/WizardStep";
import PageHeader from "../PageHeader";
import ToastLayer from "../ToastLayer";

type JourneyStep = "connect" | "consent" | "syncing" | "done";

const STEP_ORDER: JourneyStep[] = ["connect", "consent", "syncing", "done"];

const stepState = (
  step: JourneyStep,
  current: JourneyStep,
): WizardStepState => {
  const a = STEP_ORDER.indexOf(step);
  const b = STEP_ORDER.indexOf(current);
  return a < b ? "done" : a === b ? "current" : "todo";
};

export const AccountsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrgId } = useOrg();
  const accounts = useAccountsController(activeOrgId);
  const reduced = useReducedMotion();

  const [journeyOpen, setJourneyOpen] = useState(
    searchParams.get("link") === "1",
  );
  const [step, setStep] = useState<JourneyStep>("connect");
  const [linkId, setLinkId] = useState<string | null>(null);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);
  const [finalCount, setFinalCount] = useState<number | null>(null);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<BankLink | null>(null);
  const [unlinkChoice, setUnlinkChoice] = useState("keep");
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    },
    [],
  );

  const resetJourney = () => {
    setStep("connect");
    setLinkId(null);
    setSyncJobId(null);
    setCounter(0);
    setFinalCount(null);
    setJourneyError(null);
  };

  const startConnect = async () => {
    setBusy(true);
    setJourneyError(null);
    try {
      const config = await accounts.startLink();
      setLinkId(config.link_id);
      setStep("consent");
    } catch (err) {
      setJourneyError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  };

  /** MI-9 syncing: poll the bank-sync import job; the live counter ticks
   * while the job processes and lands on the real row count. */
  const watchSync = (jobId: string) => {
    const tick = async () => {
      try {
        const detail = await importsRepo.get(jobId, { orgId: activeOrgId });
        if (detail.job.status === "processing") {
          setCounter((prev) => prev + Math.ceil(Math.random() * 3));
          pollRef.current = setTimeout(tick, reduced ? 800 : 350);
        } else {
          setFinalCount(detail.job.total_parsed);
          setCounter(detail.job.total_parsed);
          setStep("done");
          await accounts.refresh();
        }
      } catch {
        setJourneyError("Sync polling failed — check the imports hub.");
      }
    };
    pollRef.current = setTimeout(tick, 400);
  };

  const approveConsent = async () => {
    if (!linkId) return;
    setBusy(true);
    setJourneyError(null);
    try {
      // Mono widget hand-off: the mock exchanges the widget success code.
      await accounts.exchange(linkId, "mock-widget-code");
      setStep("syncing");
      const { job_id } = await accounts.syncNow(linkId);
      setSyncJobId(job_id);
      watchSync(job_id);
    } catch (err) {
      setJourneyError(err instanceof Error ? err.message : "Consent failed");
    } finally {
      setBusy(false);
    }
  };

  const manualSync = async (link: BankLink) => {
    try {
      const { job_id } = await accounts.syncNow(link.id);
      setToast(`Sync started — job ${job_id}`);
      await accounts.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setToast("Manual sync is limited to once every 10 minutes.");
      } else {
        setToast(err instanceof Error ? err.message : "Sync failed");
      }
    }
  };

  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    await accounts.unlink(unlinkTarget.id, unlinkChoice === "purge");
    setUnlinkTarget(null);
    setUnlinkChoice("keep");
    setToast("Account unlinked");
  };

  const reauthLinks = accounts.links.filter(
    (link) => link.status === "reauth_required",
  );

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Bank connections via Mono — synced transactions go through the same staged review as uploads."
        actions={
          <Button
            size="sm"
            onClick={() => {
              resetJourney();
              setJourneyOpen(true);
            }}
          >
            <Plus aria-hidden className="mr-1 inline h-3.5 w-3.5" />
            Link account
          </Button>
        }
      />

      {accounts.error ? (
        <div className="mb-4">
          <Banner kind="error">{accounts.error}</Banner>
        </div>
      ) : null}

      {reauthLinks.map((link) => (
        <div key={link.id} className="mb-3">
          <Banner
            kind="error"
            action={
              <Button
                size="sm"
                kind="quiet"
                onClick={() => {
                  resetJourney();
                  setJourneyOpen(true);
                }}
              >
                Reconnect
              </Button>
            }
          >
            {link.institution} {link.masked_account} needs re-authentication —
            syncs are paused until you reconnect.
          </Banner>
        </div>
      ))}

      {accounts.loading && accounts.links.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="stat" />
          ))}
        </div>
      ) : accounts.links.length === 0 ? (
        <EmptyState
          kind="accounts"
          onAction={() => {
            resetJourney();
            setJourneyOpen(true);
          }}
          className="mx-auto mt-16 max-w-md"
        />
      ) : (
        <ul className="grid list-none grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.links.map((link) => (
            <li key={link.id}>
              <LinkAccountCard
                link={link}
                action={
                  <div className="flex flex-col gap-2">
                    <dl className="flex items-center justify-between text-[12px] text-text-2">
                      <dt>Sync schedule</dt>
                      <dd>Daily · 06:00</dd>
                    </dl>
                    <Switch
                      label="Auto-confirm clean syncs"
                      // Trust path (flows/import.md §5): opt-in once ≥3
                      // clean syncs were manually confirmed; anomalies or
                      // duplicates always force review regardless.
                      helper="Opens up after 3 manually confirmed clean syncs — anomalies and duplicates still go to review."
                      checked={link.auto_confirm}
                      onCheckedChange={(next) =>
                        void accounts.setAutoConfirm(link.id, next)
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        kind="quiet"
                        size="sm"
                        disabled={
                          link.status === "reauth_required" ||
                          link.status === "paused" ||
                          link.status === "pending"
                        }
                        onClick={() => void manualSync(link)}
                      >
                        <RefreshCw
                          aria-hidden
                          className="mr-1 inline h-3 w-3"
                        />
                        Sync now
                      </Button>
                      {link.status === "active" || link.status === "paused" ? (
                        <Button
                          kind="quiet"
                          size="sm"
                          onClick={() =>
                            void accounts.setPaused(
                              link.id,
                              link.status !== "paused",
                            )
                          }
                        >
                          {link.status === "paused" ? "Resume" : "Pause"}
                        </Button>
                      ) : null}
                      <Button
                        kind="destructive"
                        size="sm"
                        onClick={() => setUnlinkTarget(link)}
                      >
                        Unlink
                      </Button>
                    </div>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {/* MI-9 journey: connect → consent → syncing (live counter) → done */}
      <Modal
        open={journeyOpen}
        onOpenChange={(open) => {
          setJourneyOpen(open);
          if (!open) resetJourney();
        }}
        title="Link a bank account"
        size="md"
      >
        <nav
          aria-label="Link progress"
          className="mb-4 flex items-center gap-2"
        >
          <WizardStep
            state={stepState("connect", step)}
            label="Connect"
            index={1}
            orientation="horizontal"
          />
          <WizardStep
            state={stepState("consent", step)}
            label="Consent"
            index={2}
            orientation="horizontal"
          />
          <WizardStep
            state={stepState("syncing", step)}
            label="Syncing"
            index={3}
            orientation="horizontal"
            progress={
              step === "syncing" ? (
                <ProgressBar
                  size="sm"
                  label={`${counter} transactions synced…`}
                />
              ) : undefined
            }
          />
          <WizardStep
            state={step === "done" ? "current" : "todo"}
            label="Done"
            index={4}
            orientation="horizontal"
          />
        </nav>

        {step === "connect" ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-5 text-text-2">
              Expendit connects through{" "}
              <strong className="text-text">Mono</strong> with read-only access
              — we can see transactions, never move money. You can unlink at any
              time.
            </p>
            <Button loading={busy} onClick={() => void startConnect()}>
              Continue to Mono
            </Button>
          </div>
        ) : null}

        {step === "consent" ? (
          <div className="space-y-3">
            {/* Mono widget hand-off (mocked provider frame) */}
            <section
              aria-label="Mono connect"
              className="rounded border border-border bg-bg-elev p-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-bg">
                  <Landmark aria-hidden className="h-4 w-4 text-text" />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-text">
                    GTBank — Current account
                  </p>
                  <p className="font-mono text-[12px] text-text-2">···· 0482</p>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-4 text-text-2">
                Mono will share account details and transaction history with
                Expendit. Read-only.
              </p>
            </section>
            <div className="flex gap-2">
              <Button loading={busy} onClick={() => void approveConsent()}>
                Approve
              </Button>
              <Button
                kind="quiet"
                onClick={() => {
                  setJourneyOpen(false);
                  resetJourney();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {step === "syncing" ? (
          <div className="space-y-3">
            <p className="text-[13px] text-text-2">
              Pulling transactions — this account&apos;s history is being staged
              for review.
            </p>
            <ProgressBar label={`${counter} transactions synced…`} />
          </div>
        ) : null}

        {step === "done" ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-5 text-text">
              Connected. {finalCount ?? counter} transactions synced and staged
              for review — nothing lands in the ledger until you confirm.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setJourneyOpen(false);
                  if (syncJobId) router.push(`/dashboard/imports/${syncJobId}`);
                }}
              >
                Review synced transactions
              </Button>
              <Button
                kind="quiet"
                onClick={() => {
                  setJourneyOpen(false);
                  resetJourney();
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}

        {journeyError ? (
          <p role="alert" className="mt-3 text-[13px] text-expense">
            {journeyError}
          </p>
        ) : null}
      </Modal>

      {/* Unlink with keep-or-purge history choice (BNK-002) */}
      <Modal
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
        title={`Unlink ${unlinkTarget?.institution ?? ""} ${unlinkTarget?.masked_account ?? ""}`}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button kind="quiet" onClick={() => setUnlinkTarget(null)}>
              Cancel
            </Button>
            <Button
              kind={unlinkChoice === "purge" ? "destructive" : "primary"}
              onClick={() => void confirmUnlink()}
            >
              Unlink
            </Button>
          </div>
        }
      >
        <Radio
          variant="choice-card"
          value={unlinkChoice}
          onValueChange={setUnlinkChoice}
          options={[
            {
              value: "keep",
              label: "Keep imported transactions",
              description: `${unlinkTarget?.imported_txn_count ?? 0} transactions stay in your ledger; only the connection is removed.`,
            },
            {
              value: "purge",
              label: "Delete imported transactions",
              description:
                "Every transaction synced from this account is removed from the ledger.",
            },
          ]}
        />
      </Modal>

      <ToastLayer message={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default AccountsView;
