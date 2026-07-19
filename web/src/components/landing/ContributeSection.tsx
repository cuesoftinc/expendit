"use client";

/**
 * A8 — For developers / Contribute: stack line, architecture
 * mini-diagram, "interesting problems" list, good-first-issue tags,
 * CONTRIBUTING + Discord links, GitHub badge with runtime star count
 * (neutral "Star on GitHub" fallback — no number is ever hard-coded,
 * pages.md A8).
 */

import React from "react";
import Tag from "@/components/ui/Tag";
import {
  formatStars,
  useGithubStarsController,
} from "@/controllers/use-github-stars";
import { useAnalyticsController } from "@/controllers/use-analytics";
import { SectionHeading, SectionInner } from "./Section";
import {
  ANCHORS,
  CONTRIBUTING_URL,
  GITHUB_ISSUES_URL,
  GITHUB_URL,
} from "./links";

const PROBLEMS = [
  "A rules-as-data tax engine — changing a threshold is a docs PR, not a deploy",
  "Statement parsers that survive messy bank CSVs and scanned PDFs",
  "Anomaly math: trailing medians, z-scores and duplicate detection",
  "Canonical line-item mapping with a ±1% identity cross-check",
];

const GOOD_FIRST_ISSUES = [
  "good first issue · CSV edge cases",
  "good first issue · ratio traces",
];

const GitHubMark: React.FC<{ className?: string }> = ({ className }) => (
  // Brand glyph (icon/brand-github, design.md §8.1) — not Lucide.
  <svg
    viewBox="0 0 16 16"
    aria-hidden
    className={className}
    fill="currentColor"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

/** A8 architecture mini-diagram — web → api → mongo/redis (tokens only). */
const ArchDiagram: React.FC = () => {
  const box =
    "flex h-11 w-40 items-center justify-center rounded border border-border bg-bg-elev font-mono text-[13px] text-text";
  const connector = "bg-border";
  return (
    <figure
      aria-label="Architecture: web (Next.js) talks to api (Go/Gin), which uses Mongo and Redis"
      className="mx-auto mt-8 w-full max-w-[720px] rounded border border-border p-8"
    >
      <div className="flex items-center justify-center">
        <div className={box}>web · Next.js</div>
        <div aria-hidden className={`h-px w-8 sm:w-16 ${connector}`} />
        <div className={box}>api · Go/Gin</div>
        <div aria-hidden className={`h-px w-4 sm:w-8 ${connector}`} />
        <div aria-hidden className="flex flex-col items-start self-stretch">
          <div className={`w-px flex-1 ${connector}`} />
          <div className={`w-px flex-1 ${connector}`} />
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center">
            <div aria-hidden className={`h-px w-4 sm:w-8 ${connector}`} />
            <div className={box}>mongo</div>
          </div>
          <div className="flex items-center">
            <div aria-hidden className={`h-px w-4 sm:w-8 ${connector}`} />
            <div className={box}>redis</div>
          </div>
        </div>
      </div>
    </figure>
  );
};

export const ContributeSection: React.FC = () => {
  const { stars } = useGithubStarsController();
  const { track } = useAnalyticsController();

  return (
    <section id={ANCHORS.contribute} className="bg-bg py-20">
      <SectionInner>
        <SectionHeading>
          For developers — come build the hard parts
        </SectionHeading>
        <p className="mt-4 text-center font-mono text-[13px] text-text-2">
          Go/Gin API · Next.js web · Mongo/Postgres/Redis
        </p>

        <ArchDiagram />

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-base font-semibold text-text">
              Problems worth your weekend
            </h3>
            <ul className="mt-4 space-y-3">
              {PROBLEMS.map((problem) => (
                <li
                  key={problem}
                  className="flex gap-2 text-[13px] leading-relaxed"
                >
                  <span aria-hidden className="text-accent">
                    →
                  </span>
                  <span className="text-text-2">{problem}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {GOOD_FIRST_ISSUES.map((label) => (
                <a
                  key={label}
                  href={GITHUB_ISSUES_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    track("contribute_click", { target: "good_first_issue" })
                  }
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Tag tint="neutral" size="md">
                    {label}
                  </Tag>
                </a>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <a
                href={CONTRIBUTING_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  track("contribute_click", { target: "contributing_md" })
                }
                className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                CONTRIBUTING.md →
              </a>
              {/* Runtime star count; neutral label when unknown. */}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                data-testid="github-star-badge"
                onClick={() => track("github_click", { source: "contribute" })}
                className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-[13px] font-medium text-text transition-colors duration-fast ease-standard hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <GitHubMark className="h-4 w-4" />
                {stars === null
                  ? "Star on GitHub"
                  : `Star on GitHub · ${formatStars(stars)}`}
              </a>
            </div>
          </div>
        </div>
      </SectionInner>
    </section>
  );
};

export default ContributeSection;
