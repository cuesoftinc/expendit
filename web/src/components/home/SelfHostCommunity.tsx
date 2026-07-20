"use client";

/**
 * A8a — Self-host (dark editorial): data-ownership pitch, the tabbed
 * Docker Compose | Helm snippet (A8c, Figma 474:2 — CodeSnippet tabs mode,
 * copy ✓ morph on the active tab) with the shared MongoDB/Redis caption,
 * what ships, docs links.
 * A9 — Community: Discord card + roadmap link.
 */

import React from "react";
import { Users } from "lucide-react";
import CodeSnippet from "@/components/ui/CodeSnippet";
import EditorialCard from "@/components/ui/EditorialCard";
import { useAnalyticsController } from "@/controllers/use-analytics";
import { EditorialDark, SectionHeading, SectionInner } from "./Section";
import {
  ANCHORS,
  DISCORD_URL,
  GITHUB_URL,
  ROADMAP_URL,
  SELF_HOST_DOCS_URL,
} from "./links";

/** Mirrored two-line snippets — line 2 is `make up` (compose) or the real
 *  chart at deploy/helm. */
const SELF_HOST_TABS = [
  {
    label: "Docker Compose",
    code: "git clone https://github.com/cuesoftinc/expendit\ncd expendit && docker compose up --build -d",
  },
  {
    label: "Helm",
    code: "git clone https://github.com/cuesoftinc/expendit\ncd expendit && helm install expendit deploy/helm",
  },
];

const SELF_HOST_CAPTION =
  "Compose ships MongoDB + Redis — the Helm chart expects reachable instances (MONGODB_URL, REDIS_URL).";

export const SelfHostSection: React.FC = () => {
  const { track } = useAnalyticsController();
  return (
    <EditorialDark id={ANCHORS.selfHost} className="scroll-mt-16 py-20" motif>
      <SectionInner className="text-center">
        <SectionHeading>
          Self-host: your books never leave your building
        </SectionHeading>
        <div
          className="mx-auto mt-8 max-w-[460px] text-left"
          data-testid="selfhost-snippet"
        >
          <p className="mb-2 font-mono text-[13px] text-text-2">self-host</p>
          <CodeSnippet
            tabs={SELF_HOST_TABS}
            tabsLabel="Install method"
            label="Self-host commands"
          />
          {/* shared caption — rendered once, outside the tab panels, so
              both tab states keep it and switching never shifts layout */}
          <p className="mt-2 text-xs leading-normal text-text-2">
            {SELF_HOST_CAPTION}
          </p>
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-sm leading-relaxed text-text-2">
          Built for firms and accountants who can’t ship financial data to
          someone else’s cloud. One command brings up the API, web app, Mongo
          and Redis — bring your own Groq or Gemini key, or run without AI
          entirely.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("github_click", { source: "self_host" })}
            className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            github.com/cuesoftinc/expendit →
          </a>
          <a
            href={SELF_HOST_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("self_host_click", { target: "docs" })}
            className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Self-hosting docs →
          </a>
        </div>
      </SectionInner>
    </EditorialDark>
  );
};

export const CommunitySection: React.FC = () => (
  <section id={ANCHORS.community} className="scroll-mt-16 bg-bg py-20">
    <SectionInner>
      <SectionHeading>Community</SectionHeading>
      <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-8 md:flex-row">
        <EditorialCard
          kind="community"
          icon={Users}
          title="Build with us on Discord"
          body="Shape the roadmap with us — RFCs, previews and support, all in the open."
          cta="Join Discord"
          href={DISCORD_URL}
          className="w-full max-w-md"
        />
        <a
          href={ROADMAP_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          See the public roadmap →
        </a>
      </div>
    </SectionInner>
  </section>
);
