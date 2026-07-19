/**
 * A3 — Logos strip + A4 — Product pillars. Logos are text placeholders
 * for the PRD §6 case-study slots (Figma A3 as built: name-only row —
 * "banks and tools Nigerian businesses already use", not endorsements).
 */

import React from "react";
import { Calculator, FileSpreadsheet, Gauge } from "lucide-react";
import EditorialCard from "@/components/ui/EditorialCard";
import { SectionHeading, SectionInner } from "./Section";
import { ANCHORS } from "./links";

const LOGOS = [
  "Paystack",
  "Kuda",
  "Moniepoint",
  "PiggyVest",
  "Helium Health",
  "Buycoins",
];

export const LogoStrip: React.FC = () => (
  <section aria-label="Works with" className="bg-bg py-14">
    <SectionInner className="text-center">
      <p className="text-[13px] text-text-2">
        Reads statements and exports from the banks and tools Nigerian
        businesses already use
      </p>
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
        {LOGOS.map((name) => (
          <li
            key={name}
            className="text-base font-semibold tracking-tight text-text-2"
          >
            {name}
          </li>
        ))}
      </ul>
    </SectionInner>
  </section>
);

const PILLARS = [
  {
    icon: FileSpreadsheet,
    title: "Statements → intelligence",
    body: "Upload or link. AI categorizes every transaction and flags what doesn’t belong.",
    cta: "Explore imports",
  },
  {
    icon: Gauge,
    title: "Company financials",
    body: "Balance sheet to ratio grid — liquidity, solvency and profitability with formula traces.",
    cta: "Explore ratios",
  },
  {
    icon: Calculator,
    title: "Taxes — calculate and file",
    body: "VAT, PIT and CIT from your ledger; filing-ready documents for FIRS and LIRS.",
    cta: "Open tax center",
  },
];

export const PillarsSection: React.FC = () => (
  <section id={ANCHORS.product} className="scroll-mt-16 bg-bg pb-20 pt-10">
    <SectionInner>
      <SectionHeading>One ledger. Three superpowers.</SectionHeading>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <EditorialCard
            key={pillar.title}
            kind="pillar"
            icon={pillar.icon}
            title={pillar.title}
            body={pillar.body}
            cta={pillar.cta}
            href="/signin"
          />
        ))}
      </div>
    </SectionInner>
  </section>
);

export default PillarsSection;
