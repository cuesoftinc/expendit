"use client";

/**
 * A2 — Hero (dark editorial): Hero/88 display headline, sub, dual CTA
 * Try Cloud / Self Host, "Open source · MIT licensed" caption, and the
 * dashboard-in-device-frame visual (the B1 overview embed) with the
 * one-shot categorization-chip animation (pages.md A2: chips animate
 * once; static under reduced motion).
 */

import React from "react";
import Button from "@/components/ui/Button";
import CategoryChip from "@/components/ui/CategoryChip";
import { EditorialDark, SectionInner } from "./Section";
import ScaledEmbed from "./ScaledEmbed";
import {
  DashboardEmbed,
  DASHBOARD_EMBED_HEIGHT,
  DASHBOARD_EMBED_WIDTH,
} from "./embeds";

export interface HeroSectionProps {
  onTryCloud: () => void;
  onSelfHost: () => void;
  /** A1 nav (on-dark variant) rendered over the hero surface. */
  nav?: React.ReactNode;
}

/**
 * One-shot chip animation data (categorization moment, MI-2/MI-4).
 * Colors are the demo dataset's category colors (user data, not tokens).
 */
const HERO_CHIPS = [
  { id: "utilities", name: "Utilities", color: "#2456D6", ai: true },
  { id: "sales", name: "Sales", color: "#1B7F4B", ai: false },
  { id: "transport", name: "Transport", color: "#B26A00", ai: true },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onTryCloud,
  onSelfHost,
  nav,
}) => (
  <EditorialDark motif>
    {nav}
    <SectionInner className="pb-24 pt-14 text-center md:pt-24">
      <h1 className="mx-auto max-w-[1100px] font-display text-[44px] font-bold leading-[1.05] tracking-tight text-text sm:text-[56px] lg:text-[80px]">
        See every naira. File every tax.
      </h1>
      <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-text-2">
        Upload statements or link your bank — AI categorizes every transaction
        and flags what’s off. Then see your P&amp;L, your ratios, and exactly
        which tax to pay — and where to remit it.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Button kind="primary" onClick={onTryCloud}>
          Try Cloud
        </Button>
        <Button kind="quiet" onClick={onSelfHost}>
          Self Host
        </Button>
      </div>
      <p className="mt-6 text-[13px] text-text-2">
        Open source · MIT licensed · Self-host with one command
      </p>

      {/* Hero visual — the B1 overview in a device frame. */}
      <div className="relative mx-auto mt-14 max-w-[1037px]">
        {/* Categorization chips animate in once (MI-4 moment). */}
        <div
          aria-hidden
          data-testid="hero-chips"
          className="pointer-events-none absolute -top-4 right-6 flex gap-2"
        >
          {HERO_CHIPS.map((chip, index) => (
            <span
              key={chip.id}
              className="animate-rise-in motion-reduce:animate-none"
              style={{ animationDelay: `${200 + index * 150}ms` }}
            >
              <CategoryChip category={chip} aiSuggested={chip.ai} disabled />
            </span>
          ))}
        </div>
        <div
          data-theme="light"
          // Decorative composition: inert removes it from tab order and
          // the accessibility tree (the CTAs above are the real actions).
          inert
          className="overflow-hidden rounded-lg border border-border bg-bg text-left"
        >
          <ScaledEmbed
            designWidth={DASHBOARD_EMBED_WIDTH}
            designHeight={DASHBOARD_EMBED_HEIGHT}
          >
            <DashboardEmbed />
          </ScaledEmbed>
        </div>
      </div>
    </SectionInner>
  </EditorialDark>
);

export default HeroSection;
