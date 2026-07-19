"use client";

/**
 * Onboarding controller — B0 first-run (pages.md B0): create org
 * (personal default / company kind picker, data-model.md §5) then record
 * the `ai_processing` consent before first import. Views render only.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgKind } from "@/models";
import { orgsRepo, rightsRepo } from "@/models/repositories";

export interface OnboardingInput {
  kind: OrgKind;
  name: string;
  /** Company orgs: NG state code for the registered address. */
  state?: string;
  city?: string;
  addressLine1?: string;
}

export const useOnboardingController = () => {
  const router = useRouter();
  const [step, setStep] = useState<"org" | "consent">("org");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrg = useCallback(async (input: OnboardingInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const org = await orgsRepo.create({
        name: input.name,
        kind: input.kind,
        currency: "NGN",
        country: "NG",
        registered_address:
          input.kind === "company"
            ? {
                line1: input.addressLine1 ?? "",
                city: input.city ?? "",
                state: input.state ?? "NG-LA",
                country: "NG",
              }
            : undefined,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("expendit.active-org", org.id);
      }
      setStep("consent");
      return org;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create org");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  /** AI-consent sheet: accept records ai_processing; decline skips (the
   * import vision paths re-offer, flows/import.md §3 consent_required). */
  const finish = useCallback(
    async (aiConsent: boolean) => {
      setSubmitting(true);
      setError(null);
      try {
        if (aiConsent) {
          await rightsRepo.recordConsent("ai_processing", "1.0");
        }
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save consent");
      } finally {
        setSubmitting(false);
      }
    },
    [router],
  );

  return { step, submitting, error, createOrg, finish };
};
