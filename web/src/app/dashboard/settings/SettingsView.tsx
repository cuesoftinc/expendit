"use client";

/**
 * B9 `/dashboard/settings` — Settings (pages.md B9): org profile (name,
 * registered address, fiscal year end — company orgs), members/roles
 * (invite → pending until first sign-in), data & privacy (AI-processing
 * consent, export-all USR-001 with 202-job progress → signed URL, purge
 * USR-002 with MI-15 typed confirm + 7-day grace + cancel), bank-link
 * permissions pointer, notifications, theme control (sets data-theme).
 */

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatIso } from "@/lib/dates";
import { Download } from "lucide-react";
import {
  useOrg,
  useSettingsController,
  useThemeController,
} from "@/controllers";
import { ApiError } from "@/models/repositories";
import type { ExportJob, OrgRole, PurgeRequest } from "@/models";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import FormRow from "@/components/ui/FormRow";
import Input from "@/components/ui/Input";
import MemberRow from "@/components/ui/MemberRow";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Switch from "@/components/ui/Switch";
import PageHeader from "../PageHeader";
import ToastLayer from "../ToastLayer";

/**
 * Fiscal-year-end options — the wire format stays MM-DD (api.md), the
 * labels read human ("31 December") per the B9 frame.
 */
const FISCAL_YEAR_END_OPTIONS = [
  { value: "01-31", label: "31 January" },
  { value: "02-28", label: "28 February" },
  { value: "03-31", label: "31 March" },
  { value: "04-30", label: "30 April" },
  { value: "05-31", label: "31 May" },
  { value: "06-30", label: "30 June" },
  { value: "07-31", label: "31 July" },
  { value: "08-31", label: "31 August" },
  { value: "09-30", label: "30 September" },
  { value: "10-31", label: "31 October" },
  { value: "11-30", label: "30 November" },
  { value: "12-31", label: "31 December" },
];

const Section: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section
    aria-label={title}
    className="rounded border border-border bg-bg p-4"
  >
    <header className="mb-3">
      <h2 className="text-[13px] font-medium text-text">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-[12px] text-text-2">{description}</p>
      ) : null}
    </header>
    {children}
  </section>
);

export const SettingsView: React.FC = () => {
  const router = useRouter();
  const { activeOrg, activeOrgId } = useOrg();
  const settings = useSettingsController(activeOrgId);
  const { theme, setTheme } = useThemeController();

  const isCompany = activeOrg?.kind === "company";
  const [orgName, setOrgName] = useState<string | null>(null);
  const [fiscalYearEnd, setFiscalYearEnd] = useState<string | null>(null);
  const [address, setAddress] = useState<{
    line1: string;
    city: string;
    state: string;
  } | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviting, setInviting] = useState(false);

  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [purge, setPurge] = useState<PurgeRequest | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    },
    [],
  );

  // Restore an open grace window on mount — the banner + cancel must
  // survive reloads (flows/rights.md §2; system QA 2026-07-19).
  const { purgeStatus } = settings;
  useEffect(() => {
    let cancelled = false;
    void purgeStatus()
      .then((request) => {
        if (!cancelled && request?.status === "pending") setPurge(request);
      })
      .catch(() => {
        // Read-only affordance restore — errors stay silent here; writes
        // still surface purge_pending through their own toasts.
      });
    return () => {
      cancelled = true;
    };
  }, [purgeStatus]);

  const aiConsented = settings.consents.some(
    (record) => record.document === "ai_processing",
  );

  const saveOrg = async () => {
    setSavingOrg(true);
    try {
      await settings.updateOrg({
        ...(orgName !== null ? { name: orgName } : {}),
        ...(fiscalYearEnd !== null ? { fiscal_year_end: fiscalYearEnd } : {}),
        ...(address !== null && activeOrg?.registered_address
          ? {
              registered_address: {
                ...activeOrg.registered_address,
                ...address,
              },
            }
          : {}),
      });
      setToast("Organization updated");
      setOrgName(null);
      setFiscalYearEnd(null);
      setAddress(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingOrg(false);
    }
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await settings.inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setToast("Invite sent — pending until their first sign-in");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  /** USR-001: 202 job → running → completed with a signed URL (7-day TTL). */
  const startExport = async () => {
    try {
      const { job_id } = await settings.requestExport();
      setExportJob({
        job_id,
        status: "running",
        signed_url: null,
        expires_at: null,
      });
      const poll = async () => {
        const status = await settings.exportStatus(job_id);
        setExportJob(status);
        if (status.status === "running") {
          pollRef.current = setTimeout(() => void poll(), 1200);
        }
      };
      pollRef.current = setTimeout(() => void poll(), 1200);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Export failed");
    }
  };

  /** USR-002 (MI-15): typed confirm → 7-day grace; cancel within grace. */
  const startPurge = async () => {
    try {
      const request = await settings.requestPurge();
      setPurge(request);
      setPurgeOpen(false);
      setToast("Deletion scheduled — you have a 7-day grace window");
    } catch (err) {
      if (err instanceof ApiError && err.code === "purge_pending") {
        setToast("A purge is already pending.");
        setPurgeOpen(false);
        // Surface the existing window's banner + cancel affordance.
        void purgeStatus().then(
          (request) => request && setPurge(request),
          () => {},
        );
      } else {
        setToast(err instanceof Error ? err.message : "Request failed");
      }
    }
  };

  const cancelPurge = async () => {
    await settings.cancelPurge();
    setPurge(null);
    setToast("Deletion cancelled — your data stays put");
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace, people, privacy, and appearance."
      />

      {settings.error ? (
        <div className="mb-4">
          <Banner kind="error">{settings.error}</Banner>
        </div>
      ) : null}

      {purge && purge.status === "pending" ? (
        <div className="mb-4">
          <Banner
            kind="error"
            action={
              <Button size="sm" kind="quiet" onClick={() => void cancelPurge()}>
                Cancel deletion
              </Button>
            }
          >
            Account deletion is pending — everything is read-only until{" "}
            {formatIso(purge.effective_at, "d MMM yyyy")} (7-day grace).
          </Banner>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title="Organization profile"
          description={
            isCompany
              ? "Name, registered address, and fiscal year end feed CIT/VAT resolution."
              : "Your personal workspace."
          }
        >
          <div className="space-y-3">
            <FormRow label="Name">
              {(id) => (
                <Input
                  id={id}
                  value={orgName ?? activeOrg?.name ?? ""}
                  onChange={(event) => setOrgName(event.target.value)}
                />
              )}
            </FormRow>
            {isCompany ? (
              <>
                {/* Editable registered address (Figma B9 190:4223) —
                    resolves the CIT/VAT remittance authority. */}
                <FormRow
                  label="Registered address"
                  helper="Street, city and state — the state resolves your remittance authority."
                >
                  {(id) => (
                    <div className="space-y-2">
                      <Input
                        id={id}
                        aria-label="Address line"
                        value={
                          address?.line1 ??
                          activeOrg?.registered_address?.line1 ??
                          ""
                        }
                        onChange={(event) =>
                          setAddress((prev) => ({
                            line1: event.target.value,
                            city:
                              prev?.city ??
                              activeOrg?.registered_address?.city ??
                              "",
                            state:
                              prev?.state ??
                              activeOrg?.registered_address?.state ??
                              "",
                          }))
                        }
                      />
                      <div className="flex gap-2">
                        <Input
                          aria-label="City"
                          placeholder="City"
                          value={
                            address?.city ??
                            activeOrg?.registered_address?.city ??
                            ""
                          }
                          onChange={(event) =>
                            setAddress((prev) => ({
                              line1:
                                prev?.line1 ??
                                activeOrg?.registered_address?.line1 ??
                                "",
                              city: event.target.value,
                              state:
                                prev?.state ??
                                activeOrg?.registered_address?.state ??
                                "",
                            }))
                          }
                        />
                        <Input
                          aria-label="State"
                          placeholder="NG-LA"
                          value={
                            address?.state ??
                            activeOrg?.registered_address?.state ??
                            ""
                          }
                          onChange={(event) =>
                            setAddress((prev) => ({
                              line1:
                                prev?.line1 ??
                                activeOrg?.registered_address?.line1 ??
                                "",
                              city:
                                prev?.city ??
                                activeOrg?.registered_address?.city ??
                                "",
                              state: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </FormRow>
                <FormRow
                  label="Fiscal year end"
                  helper="Defines FY periods for statements and CIT."
                >
                  {() => {
                    const fyeValue =
                      fiscalYearEnd ?? activeOrg?.fiscal_year_end ?? "12-31";
                    // Non-month-end legacy values stay selectable raw.
                    const options = FISCAL_YEAR_END_OPTIONS.some(
                      (option) => option.value === fyeValue,
                    )
                      ? FISCAL_YEAR_END_OPTIONS
                      : [
                          { value: fyeValue, label: fyeValue },
                          ...FISCAL_YEAR_END_OPTIONS,
                        ];
                    return (
                      <Select
                        aria-label="Fiscal year end"
                        options={options}
                        value={fyeValue}
                        onValueChange={setFiscalYearEnd}
                      />
                    );
                  }}
                </FormRow>
              </>
            ) : null}
            <Button
              size="sm"
              loading={savingOrg}
              disabled={
                orgName === null && fiscalYearEnd === null && address === null
              }
              onClick={() => void saveOrg()}
            >
              Save changes
            </Button>
          </div>
        </Section>

        <Section
          title="Members & roles"
          description="Email invites stay pending until that email's first sign-in."
        >
          {isCompany ? (
            <>
              <ul className="list-none rounded border border-border">
                {settings.members.map((member) => (
                  <MemberRow
                    key={member.user_id}
                    member={member}
                    onRoleChange={(role) =>
                      void settings.setMemberRole(member.user_id, role)
                    }
                    onRemove={() => void settings.removeMember(member.user_id)}
                  />
                ))}
              </ul>
              <form
                className="mt-3 flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void invite();
                }}
              >
                <Input
                  label="Invite by email"
                  name="invite-email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="finance@company.com"
                />
                <div className="w-28 shrink-0">
                  <Select
                    options={[
                      { value: "admin", label: "Admin" },
                      { value: "member", label: "Member" },
                    ]}
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as OrgRole)}
                    size="sm"
                  />
                </div>
                <Button size="sm" type="submit" loading={inviting}>
                  Invite
                </Button>
              </form>
            </>
          ) : (
            <p className="text-[13px] text-text-2">
              Members and roles live on company orgs — switch to your company
              workspace to manage people.
            </p>
          )}
        </Section>

        <Section
          title="Data & privacy"
          description="Your data, your rights — export everything, or delete it all."
        >
          <div className="space-y-4">
            <Switch
              label="AI processing"
              helper="Lets AI categorize imports and parse receipts/scans; providers are disclosed in the privacy hub."
              checked={aiConsented}
              onCheckedChange={(next) => {
                if (next) {
                  void settings
                    .recordConsent("ai_processing", "1.0")
                    .then(() => setToast("AI processing consent recorded"));
                } else {
                  setToast(
                    "Consent withdrawal lands with the backend — contact support meanwhile.",
                  );
                }
              }}
            />

            <div>
              <h3 className="text-[13px] font-medium text-text">
                Export all data (USR-001)
              </h3>
              <p className="mt-0.5 text-[12px] text-text-2">
                ZIP of CSVs per collection + manifest — the download link lasts
                7 days.
              </p>
              <div className="mt-2">
                {exportJob?.status === "running" ? (
                  // Determinate export strip (Figma B9b): record count +
                  // "ZIP · N%" + the email/rate-limit reassurance.
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="text-text">
                        Preparing export
                        {exportJob.record_count
                          ? ` — ${exportJob.record_count.toLocaleString("en-NG")} records`
                          : "…"}
                      </span>
                      <span className="tabular-nums text-text-2">
                        ZIP · {exportJob.progress ?? 0}%
                      </span>
                    </div>
                    <ProgressBar size="sm" value={exportJob.progress ?? 0} />
                    <p className="text-[12px] leading-4 text-text-2">
                      We&apos;ll email you when it&apos;s ready. You can export
                      up to twice a day.
                    </p>
                  </div>
                ) : exportJob?.status === "completed" &&
                  exportJob.signed_url ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = exportJob.signed_url as string;
                      link.download = "";
                      link.click();
                    }}
                  >
                    <Download aria-hidden className="mr-1 inline h-3.5 w-3.5" />
                    Download archive
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    kind="quiet"
                    onClick={() => void startExport()}
                  >
                    Request export
                  </Button>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-expense">
                Delete account & data (USR-002)
              </h3>
              <p className="mt-0.5 text-[12px] text-text-2">
                Type-to-confirm, then a 7-day grace window — cancel any time
                before it runs.
              </p>
              <div className="mt-2">
                <Button
                  size="sm"
                  kind="destructive"
                  disabled={purge?.status === "pending"}
                  onClick={() => setPurgeOpen(true)}
                >
                  Delete everything…
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Connections & notifications">
          <div className="space-y-4">
            <div>
              <h3 className="text-[13px] font-medium text-text">
                Bank-link permissions
              </h3>
              <p className="mt-0.5 text-[12px] text-text-2">
                Read-only via Mono; pause, re-auth, or unlink per account.
              </p>
              <Button
                size="sm"
                kind="quiet"
                className="mt-2"
                onClick={() => router.push("/dashboard/accounts")}
              >
                Manage linked accounts
              </Button>
            </div>
            <Switch
              label="Deadline reminders"
              helper="T-30/T-7/T-1 tax deadline notifications."
              checked
              onCheckedChange={() =>
                setToast("Notification prefs land with the backend")
              }
            />
            <Switch
              label="Import summaries"
              helper="Email when a staged import is ready for review."
              checked={false}
              onCheckedChange={() =>
                setToast("Notification prefs land with the backend")
              }
            />
          </div>
        </Section>

        <Section
          title="Appearance"
          description="Theme applies immediately; density is per-table."
        >
          <FormRow label="Theme">
            {() => (
              <SegmentedControl
                aria-label="Theme"
                // Light | Dark | System — mirrors the toggle's cycle
                // order (Figma B9 frame).
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "System" },
                ]}
                value={theme}
                onValueChange={(value) =>
                  setTheme(value as "light" | "dark" | "system")
                }
              />
            )}
          </FormRow>
        </Section>
      </div>

      {/* MI-15 danger flow (converged model, Figma B9 190:4223 + B9b
          208:4194): type the ORG NAME to confirm, 5s danger-armed CTA,
          "Export first" escape hatch; grace handled by the controller. */}
      <Modal
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        title="Delete account & all data"
        description="Everything — ledger, statements, filings, links — is deleted after a 7-day grace window. Writes are blocked while the window is open."
        variant="danger"
        confirmPhrase={activeOrg?.name ?? ""}
        confirmLabel="Schedule deletion"
        onConfirm={() => void startPurge()}
        footer={
          <Button
            size="sm"
            kind="quiet"
            onClick={() => {
              setPurgeOpen(false);
              void startExport();
              setToast("Preparing your export — deletion can wait.");
            }}
          >
            Export first
          </Button>
        }
      />

      <ToastLayer message={toast} onDismiss={() => setToast(null)} />
    </>
  );
};

export default SettingsView;
