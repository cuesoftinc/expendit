"use client";

/**
 * A10 — Cloud vs Self-host comparison · A10a — FAQ accordion (one open
 * at a time, `faq_open` events) · A10b — final CTA band (re-emits the A2
 * events). Pricing accuracy: the ComparisonTable price row + caption are
 * the entire pricing story ("Announced at GA" / "Free forever",
 * design.md §8.2b marketing-accuracy note).
 */

import React from "react";
import Accordion from "@/components/ui/Accordion";
import Button from "@/components/ui/Button";
import ComparisonTable from "@/components/ui/ComparisonTable";
import { useAnalyticsController } from "@/controllers/use-analytics";
import { EditorialDark, SectionHeading, SectionInner } from "./Section";
import { ANCHORS } from "./links";

const COMPARISON_ROWS = [
  {
    feature: "AI categorization",
    cloud: { kind: "check" as const },
    selfHost: { kind: "check" as const },
  },
  {
    feature: "Bank linking (Mono)",
    cloud: { kind: "check" as const },
    selfHost: { kind: "text" as const, text: "Bring your keys" },
  },
  {
    feature: "Tax filing documents",
    cloud: { kind: "check" as const },
    selfHost: { kind: "check" as const },
  },
  {
    feature: "Managed backups & SLA",
    cloud: { kind: "check" as const },
    selfHost: { kind: "x" as const },
  },
  {
    feature: "Your infrastructure",
    cloud: { kind: "x" as const },
    selfHost: { kind: "check" as const },
  },
  {
    feature: "Price",
    cloud: { kind: "text" as const, text: "Announced at GA" },
    selfHost: { kind: "text" as const, text: "Free forever" },
  },
];

export const CompareSection: React.FC<{
  onTryCloud: () => void;
  onSelfHost: () => void;
}> = ({ onTryCloud, onSelfHost }) => (
  <section id={ANCHORS.compare} className="bg-bg py-20">
    <SectionInner>
      <SectionHeading>Cloud or self-host — same product</SectionHeading>
      <div className="mx-auto mt-10 max-w-2xl">
        <ComparisonTable
          rows={COMPARISON_ROWS}
          cloudCta={
            <Button kind="primary" size="sm" onClick={onTryCloud}>
              Try the sandbox
            </Button>
          }
          selfHostCta={
            <Button kind="quiet" size="sm" onClick={onSelfHost}>
              Self Host
            </Button>
          }
        />
      </div>
    </SectionInner>
  </section>
);

/**
 * FAQ content — Figma questions; answer 1 verbatim from the frame,
 * answers 2–5 written to the pages.md A10a contract (consent-gated AI ·
 * self-host completeness · v1 "filing-ready + guided handoff" · rights)
 * and the marketing-accuracy standard.
 */
const FAQ_ITEMS = [
  {
    id: "bank-safety",
    title: "Is it safe to connect my bank?",
    content:
      "Bank sign-in happens inside Mono’s hosted widget — your credentials never touch Expendit’s servers. Links are read-only, and you can pause or unlink any time.",
  },
  {
    id: "ai-data",
    title: "What does the AI actually see?",
    content:
      "Nothing until you consent: AI processing is gated on an explicit consent record, and the providers we use are disclosed in Settings → Data & privacy. Suggestions stay marked ✨ until a human confirms them — and if you self-host, you can run without AI entirely.",
  },
  {
    id: "filing",
    title: "Does Expendit file my taxes for me?",
    content:
      "In v1, Expendit computes PIT, CIT and VAT from your ledger and produces filing-ready documents — including a remittance sheet that names the authority (FIRS or your State IRS), the amount, the deadline and the payment channel — with a guided handoff. Direct e-filing comes later where authority APIs exist.",
  },
  {
    id: "data-out",
    title: "Can I take my data out?",
    content:
      "Yes. Export everything — reports, statements and a full account export — whenever you want. Delete-all is a first-class right: typed confirmation, a grace window, then a complete purge.",
  },
  {
    id: "license",
    title: "What’s the license?",
    content:
      "MIT. Cloud and self-host run the same open-source code — self-hosting is free forever.",
  },
];

export const FaqSection: React.FC = () => {
  const { track } = useAnalyticsController();
  return (
    <section id={ANCHORS.faq} className="bg-bg pb-24 pt-16">
      <SectionInner>
        <SectionHeading>Questions, answered</SectionHeading>
        <div className="mx-auto mt-8 max-w-[720px]">
          <Accordion
            mode="single"
            defaultOpen={["bank-safety"]}
            onOpenChange={(openIds) => {
              if (openIds[0]) track("faq_open", { question: openIds[0] });
            }}
            items={FAQ_ITEMS.map((item) => ({
              id: item.id,
              title: item.title,
              content: <span className="text-text-2">{item.content}</span>,
            }))}
          />
        </div>
      </SectionInner>
    </section>
  );
};

export const FinalCtaSection: React.FC<{
  onTryCloud: () => void;
  onSelfHost: () => void;
}> = ({ onTryCloud, onSelfHost }) => (
  <EditorialDark className="py-24" motif>
    <SectionInner className="text-center">
      <h2 className="mx-auto max-w-3xl font-display text-4xl font-bold tracking-tight text-text md:text-5xl">
        Your numbers are ready to talk.
      </h2>
      <p className="mt-5 text-sm text-text-2">
        Start in the sandbox today — free forever if you self-host.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Button kind="primary" onClick={onTryCloud}>
          Try Cloud
        </Button>
        <Button kind="quiet" onClick={onSelfHost}>
          Self Host
        </Button>
      </div>
    </SectionInner>
  </EditorialDark>
);
