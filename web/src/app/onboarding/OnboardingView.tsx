"use client";

/**
 * B0 `/onboarding` — first-run (pages.md B0): one post-auth screen — org
 * create with the personal/company kind picker (data-model.md §5 "Who
 * uses which org kind") plus the AI-consent sheet (`ai_processing`
 * CONSENT_RECORD) before first import. Also serves "+ Create
 * organization" from the org switcher (?create=1).
 */

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { useOnboardingController, useRequireAuth } from "@/controllers";
import type { OrgKind } from "@/models";
import { PRIVACY_HUB_URL } from "@/components/home/links";
import Button from "@/components/ui/Button";
import FormRow from "@/components/ui/FormRow";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Radio from "@/components/ui/Radio";
import Select from "@/components/ui/Select";
import Wordmark from "@/components/ui/Wordmark";

const NG_STATES = [
  { value: "NG-LA", label: "Lagos" },
  { value: "NG-FC", label: "Abuja (FCT)" },
  { value: "NG-RI", label: "Rivers" },
  { value: "NG-KN", label: "Kano" },
  { value: "NG-OY", label: "Oyo" },
];

export const OnboardingView: React.FC = () => {
  const { user, checked } = useRequireAuth();
  const { step, submitting, error, createOrg, finish } =
    useOnboardingController();
  const [kind, setKind] = useState<OrgKind>("personal");
  const [name, setName] = useState("");
  const [state, setState] = useState<string | null>("NG-LA");
  const [city, setCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");

  if (!checked || !user) return null;

  const orgName = kind === "personal" ? name || "Personal" : name;
  const canSubmit = kind === "personal" || name.trim().length > 0;

  return (
    <main className="flex min-h-screen items-start justify-center bg-bg px-6 py-16">
      <div className="w-full max-w-lg">
        <Wordmark className="font-display text-2xl font-bold text-text" />
        <h1 className="mt-8 font-display text-xl font-semibold tracking-tight text-text">
          Set up your workspace
        </h1>
        <p className="mt-1 text-[13px] text-text-2">
          One question first: is this ledger for you, or for a company?
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || submitting) return;
            void createOrg({
              kind,
              name: orgName,
              state: state ?? undefined,
              city,
              addressLine1,
            }).catch(() => undefined);
          }}
        >
          <Radio
            variant="choice-card"
            value={kind}
            onValueChange={(next) => setKind(next as OrgKind)}
            options={[
              {
                value: "personal",
                label: "Personal",
                description:
                  "Freelancers and individuals — your own ledger, PIT-ready.",
              },
              {
                value: "company",
                label: "Company",
                description:
                  "A registered business — statements, ratios, CIT & VAT.",
              },
            ]}
          />

          <FormRow
            label={kind === "company" ? "Company name" : "Workspace name"}
            required={kind === "company"}
            helper={kind === "personal" ? 'Defaults to "Personal".' : undefined}
          >
            {(id) => (
              <Input
                id={id}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={kind === "company" ? "Cuesoft Ltd" : "Personal"}
              />
            )}
          </FormRow>

          {kind === "company" ? (
            <>
              <FormRow
                label="Registered address"
                helper="Used for CIT/VAT authority resolution."
              >
                {(id) => (
                  <Input
                    id={id}
                    value={addressLine1}
                    onChange={(event) => setAddressLine1(event.target.value)}
                    placeholder="12 Admiralty Way"
                  />
                )}
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="City">
                  {(id) => (
                    <Input
                      id={id}
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Lekki"
                    />
                  )}
                </FormRow>
                <FormRow label="State">
                  {() => (
                    <Select
                      options={NG_STATES}
                      value={state}
                      onValueChange={setState}
                      placeholder="Select state"
                    />
                  )}
                </FormRow>
              </div>
            </>
          ) : null}

          {error ? (
            <p role="alert" className="text-[13px] text-expense">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={!canSubmit} loading={submitting}>
            Create {kind === "company" ? "company org" : "workspace"}
          </Button>
        </form>
      </div>

      {/* AI-consent sheet (flows/auth.md §4; trust through disclosure). */}
      <Modal
        open={step === "consent"}
        onOpenChange={() => undefined}
        title="AI processing consent"
        variant="sheet"
        description="Before your first import, a word on how AI touches your data."
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button kind="quiet" onClick={() => void finish(false)}>
              Not now
            </Button>
            <Button loading={submitting} onClick={() => void finish(true)}>
              Allow AI processing
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-[13px] leading-5 text-text-2">
          <p className="flex items-start gap-2">
            <Sparkles
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-info"
            />
            <span>
              Imported statements and receipts are categorized by an AI provider
              (disclosed in the{" "}
              <a
                href={PRIVACY_HUB_URL}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-text"
              >
                privacy hub
              </a>
              ). Only transaction rows are sent — never your credentials.
            </span>
          </p>
          <p>
            Receipt images and image-only PDFs need AI to parse at all —
            declining limits imports to CSV and text PDFs (you can change this
            any time in Settings → Data &amp; privacy).
          </p>
        </div>
      </Modal>
    </main>
  );
};

export default OnboardingView;
