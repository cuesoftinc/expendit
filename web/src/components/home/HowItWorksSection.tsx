"use client";

/**
 * A5a — How it works: three numbered steps, each carrying a real screen
 * thumbnail (live registry compositions of the Stage-4 templates — B3b
 * staged review, B1 overview, B7 tax center). Thumbnail click scrolls to
 * the A5 live demo (pages.md A5a).
 */

import React from "react";
import DeferredPanel from "@/components/ui/DeferredPanel";
import { useAnalyticsController } from "@/controllers/use-analytics";
import { SectionHeading, SectionInner } from "./Section";
import ScaledEmbed from "./ScaledEmbed";
import {
  DashboardEmbed,
  DASHBOARD_EMBED_HEIGHT,
  DASHBOARD_EMBED_WIDTH,
  ImportReviewEmbed,
  IMPORT_EMBED_HEIGHT,
  IMPORT_EMBED_WIDTH,
  TaxCenterEmbed,
  TAX_EMBED_HEIGHT,
  TAX_EMBED_WIDTH,
} from "./embeds";
import { ANCHORS, scrollToAnchor } from "./links";

const STEPS = [
  {
    number: 1,
    title: "Import your statements",
    body: "Connect your bank through Mono or drop in CSVs and PDFs — every line is parsed and staged for review.",
    thumb: (
      <ScaledEmbed
        designWidth={IMPORT_EMBED_WIDTH}
        designHeight={IMPORT_EMBED_HEIGHT}
      >
        <ImportReviewEmbed />
      </ScaledEmbed>
    ),
  },
  {
    number: 2,
    title: "See where money goes",
    body: "Overview turns the ledger into cash flow, category breakdowns and anomaly flags as transactions land.",
    thumb: (
      <ScaledEmbed
        designWidth={DASHBOARD_EMBED_WIDTH}
        designHeight={DASHBOARD_EMBED_HEIGHT}
      >
        <DashboardEmbed />
      </ScaledEmbed>
    ),
  },
  {
    number: 3,
    title: "File with confidence",
    body: "The tax center computes PIT, CIT and VAT — every figure traceable down to its transactions.",
    thumb: (
      <ScaledEmbed
        designWidth={TAX_EMBED_WIDTH}
        designHeight={TAX_EMBED_HEIGHT}
      >
        <TaxCenterEmbed />
      </ScaledEmbed>
    ),
  },
];

export const HowItWorksSection: React.FC = () => {
  const { track } = useAnalyticsController();

  const scrollToDemo = (event: React.MouseEvent) => {
    event.preventDefault();
    track("demo_interact", { action: "how_it_works_thumbnail" });
    scrollToAnchor(ANCHORS.demo);
  };

  return (
    <section id={ANCHORS.howItWorks} className="scroll-mt-16 bg-bg py-20">
      <SectionInner>
        <SectionHeading>How it works</SectionHeading>
        {/* 3-up steps on the container-wide 384/24 rhythm (§2 pin). */}
        <ol className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
          {STEPS.map((step) => (
            <li key={step.number}>
              {/* Thumb: inert composition + link overlay (no nested
                  interactive elements — the embed is decorative). The box is
                  pinned to the frame's 384×190 thumb proportions (A5a) —
                  taller embeds clip at the bottom, so all three captions
                  sit on one aligned row. */}
              <div
                data-testid="how-thumb"
                className="relative aspect-[384/190] overflow-hidden rounded border border-border bg-bg transition-transform duration-base ease-standard hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
              >
                {/* The three thumbs are full dashboard compositions —
                    below-the-fold, they mount on approach (perf pass
                    2026-07-21). The aspect box above reserves the
                    geometry, so the placeholder just fills it. */}
                <DeferredPanel minHeight="100%" className="h-full">
                  <div inert className="pointer-events-none select-none">
                    {step.thumb}
                  </div>
                </DeferredPanel>
                <a
                  href={`#${ANCHORS.demo}`}
                  onClick={scrollToDemo}
                  aria-label={`${step.title} — jump to the live demo`}
                  className="absolute inset-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                />
              </div>
              <div
                data-testid="how-step-caption"
                className="mt-5 flex items-center gap-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-on-accent">
                  {step.number}
                </span>
                <h3 className="text-base font-semibold text-text">
                  {step.title}
                </h3>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-text-2">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </SectionInner>
    </section>
  );
};

export default HowItWorksSection;
