/**
 * A6 — AI disclosure (dark editorial) · A7 — Security & privacy.
 * Accuracy: AI providers are the architecture.md §4.1 registry (Groq →
 * Gemini, or none); no invented claims.
 */

import React from "react";
import Tag from "@/components/ui/Tag";
import { EditorialDark, SectionHeading, SectionInner } from "./Section";
import { PRIVACY_HUB_URL, SECURITY_POLICY_URL } from "./links";

export const AiSection: React.FC = () => (
  <EditorialDark className="py-20">
    <SectionInner className="text-center">
      <SectionHeading>AI that shows its work</SectionHeading>
      <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-text-2">
        Categorization and anomaly detection run on disclosed providers — listed
        here, not buried. ✨ marks every AI suggestion until a human confirms
        it. Nothing files itself.
      </p>
      <div className="mt-6 flex justify-center">
        <Tag tint="info" size="md">
          AI providers are listed in Settings → Data &amp; privacy
        </Tag>
      </div>
    </SectionInner>
  </EditorialDark>
);

const SECURITY_COLUMNS = [
  {
    title: "Encrypted",
    body: "At rest and in transit. Bank links are read-only via Mono.",
  },
  {
    title: "Retention you control",
    body: "Statements and artifacts have TTLs; exports are yours.",
  },
  {
    title: "Delete-all rights",
    body: "Export everything, then purge with typed confirmation.",
  },
];

export const SecuritySection: React.FC = () => (
  <section className="bg-bg py-20">
    <SectionInner>
      <SectionHeading>Security &amp; privacy, in plain language</SectionHeading>
      {/* 3-up columns on the container-wide 384/24 rhythm (§2 pin). */}
      <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
        {SECURITY_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-base font-semibold text-text">
              {column.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-2">
              {column.body}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
        <a
          href={SECURITY_POLICY_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          View Security Policy →
        </a>
        <a
          href={PRIVACY_HUB_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Privacy hub →
        </a>
      </div>
    </SectionInner>
  </section>
);
