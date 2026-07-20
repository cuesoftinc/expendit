"use client";

/**
 * /docs/api — public API reference (X-2). Marketing nav chrome over the
 * full-height Scalar embed, closed by a minimal legal strip (the full
 * A11 footer stays on `/`). Nav wiring mirrors HomeView: canonical
 * links (home anchors become absolute), live star count, theme toggle,
 * `github_click` / `try_cloud_click` instrumentation.
 */

import React from "react";
import MarketingNav, {
  type MarketingNavLink,
} from "@/components/ui/MarketingNav";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  useAnalyticsController,
  usePageView,
} from "@/controllers/use-analytics";
import { useGithubStarsController } from "@/controllers/use-github-stars";
import {
  ANCHORS,
  CUELABS_URL,
  CUESOFT_URL,
  DOCS_URL,
  GITHUB_URL,
  LICENSE_URL,
} from "@/components/home/links";
import { ScalarApiReference } from "./ScalarApiReference";

// The canonical 4 nav links (parity canon) — home anchors made absolute
// so they navigate back to `/` from the docs surface.
const NAV_LINKS: MarketingNavLink[] = [
  { label: "Features", href: `/#${ANCHORS.product}` },
  { label: "Pricing", href: `/#${ANCHORS.compare}` },
  { label: "Docs", href: DOCS_URL },
  { label: "GitHub", href: GITHUB_URL, star: true },
];

const legalLinkClass =
  "rounded transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export const DocsApiView: React.FC = () => {
  const { track } = useAnalyticsController();
  const { stars } = useGithubStarsController();
  usePageView("docs-api");

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <MarketingNav
        variant="dark-on-light"
        links={NAV_LINKS}
        trailing={<ThemeToggle />}
        starCount={stars}
        onLinkClick={(label) => {
          if (label === "GitHub") track("github_click", { source: "nav" });
        }}
        onTryCloud={() => track("try_cloud_click", { source: "nav" })}
      />
      <main className="flex-1">
        <ScalarApiReference />
      </main>
      {/* Minimal footer strip — verbatim legal line only (parity canon). */}
      <footer className="border-t border-border bg-bg px-6 py-4">
        <p className="mx-auto max-w-6xl text-[13px] text-text-2">
          ©{" "}
          <a
            href={CUESOFT_URL}
            target="_blank"
            rel="noreferrer"
            className={legalLinkClass}
          >
            Cuesoft Inc.
          </a>{" "}
          2026. Expendit.{" "}
          <a
            href={CUELABS_URL}
            target="_blank"
            rel="noreferrer"
            className={legalLinkClass}
          >
            CueLABS™ Division
          </a>
          .{" "}
          <a
            href={LICENSE_URL}
            target="_blank"
            rel="noreferrer"
            className={legalLinkClass}
          >
            MIT License
          </a>
          .
        </p>
      </footer>
    </div>
  );
};

export default DocsApiView;
