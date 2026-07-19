"use client";

/**
 * Public home `/` — pages.md Part A (A1–A11 + A4a/A5a/A8a/A10a/A10b),
 * Brex-editorial execution over the ui registry (Figma Home frame
 * 193:14). Render-only composition: analytics + demo state live in
 * controllers; alternating light/dark sections scope `data-theme="dark"`
 * on their own subtrees.
 */

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MarketingNav from "@/components/ui/MarketingNav";
import MarketingFooter from "@/components/ui/MarketingFooter";
import {
  useAnalyticsController,
  usePageView,
} from "@/controllers/use-analytics";
import { useGithubStarsController } from "@/controllers/use-github-stars";
import HeroSection from "./HeroSection";
import { LogoStrip, PillarsSection } from "./PillarsSection";
import DeepDivesSection from "./DeepDivesSection";
import DemoSection from "./DemoSection";
import HowItWorksSection from "./HowItWorksSection";
import { AiSection, SecuritySection } from "./TrustSections";
import ContributeSection from "./ContributeSection";
import { CommunitySection, SelfHostSection } from "./SelfHostCommunity";
import { CompareSection, FaqSection, FinalCtaSection } from "./CompareFaqCta";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  ANCHORS,
  scrollToAnchor,
  API_REFERENCE_URL,
  CUELABS_URL,
  CUESOFT_URL,
  DISCORD_URL,
  DOCS_URL,
  GITHUB_URL,
  LICENSE_URL,
  PRIVACY_HUB_URL,
  QUICKSTART_URL,
  ROADMAP_URL,
  SECURITY_POLICY_URL,
  SELF_HOST_DOCS_URL,
  STATUS_URL,
  TERMS_URL,
} from "./links";

// A1 nav — the canonical 4 text links (nav/footer parity canon,
// org SKILL.md 2026-07-19).
const NAV_LINKS = [
  { label: "Features", href: `#${ANCHORS.product}` },
  { label: "Pricing", href: `#${ANCHORS.compare}` },
  { label: "Docs", href: DOCS_URL },
  // Star badge — live count via the stars controller (canon revision:
  // never hardcoded; neutral "Star" in TEST_MODE / on fetch failure).
  { label: "GitHub", href: GITHUB_URL, star: true },
];

// A11 footer — brand block + 4 columns + legal bar (parity canon).
const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: `#${ANCHORS.product}` },
      { label: "Pricing", href: `#${ANCHORS.compare}` },
      { label: "Try Cloud", href: "/signin" },
      { label: "Self Host", href: `#${ANCHORS.selfHost}` },
    ],
  },
  {
    heading: "Docs",
    links: [
      { label: "Docs", href: DOCS_URL },
      { label: "Quickstart", href: QUICKSTART_URL },
      { label: "API reference", href: API_REFERENCE_URL },
      { label: "Self-host guide", href: SELF_HOST_DOCS_URL },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "GitHub", href: GITHUB_URL },
      { label: "Discord", href: DISCORD_URL },
      { label: "Roadmap", href: ROADMAP_URL },
      { label: "CueLABS™", href: CUELABS_URL },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: PRIVACY_HUB_URL },
      { label: "Terms", href: TERMS_URL },
      { label: "Status", href: STATUS_URL },
    ],
  },
];

export const HomeView: React.FC = () => {
  const router = useRouter();
  const { track } = useAnalyticsController();
  usePageView("home");

  // A1: on-dark over the hero → sticky dark-on-light after hero scroll.
  const heroRef = useRef<HTMLDivElement>(null);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setPastHero(!(entry?.isIntersecting ?? true)),
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const tryCloud = (source: string) => {
    track("try_cloud_click", { source });
    router.push("/signin");
  };

  const selfHost = (source: string) => {
    track("self_host_click", { source });
    scrollToAnchor(ANCHORS.selfHost);
  };

  const { stars } = useGithubStarsController();

  const navProps = {
    links: NAV_LINKS,
    trailing: <ThemeToggle />,
    starCount: stars,
    onLinkClick: (label: string) => {
      if (label === "GitHub") track("github_click", { source: "nav" });
    },
    onTryCloud: () => track("try_cloud_click", { source: "nav" }),
  };

  return (
    <div className="bg-bg">
      {/* Sticky dark-on-light nav appears once the hero is scrolled. */}
      {pastHero ? (
        <div className="fixed inset-x-0 top-0 z-sticky animate-fade-in motion-reduce:animate-none">
          <MarketingNav variant="dark-on-light" {...navProps} />
        </div>
      ) : null}

      {/* The page's one main landmark — everything but the nav + footer. */}
      <main>
        <div ref={heroRef}>
          <HeroSection
            nav={<MarketingNav variant="on-dark" {...navProps} />}
            onTryCloud={() => tryCloud("hero")}
            onSelfHost={() => selfHost("hero")}
          />
        </div>

        <LogoStrip />
        <PillarsSection />
        <DeepDivesSection />
        <DemoSection />
        <HowItWorksSection />
        <AiSection />
        <SecuritySection />
        <ContributeSection />
        <SelfHostSection />
        <CommunitySection />
        <CompareSection
          onTryCloud={() => tryCloud("compare")}
          onSelfHost={() => selfHost("compare")}
        />
        <FaqSection />
        <FinalCtaSection
          onTryCloud={() => tryCloud("final_cta")}
          onSelfHost={() => selfHost("final_cta")}
        />
      </main>

      <MarketingFooter
        columns={FOOTER_COLUMNS}
        securityPolicyHref={SECURITY_POLICY_URL}
        // Legal bar verbatim per the parity canon — Cuesoft Inc. and MIT
        // License carry their canonical links.
        note={
          <>
            ©{" "}
            <a
              href={CUESOFT_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cuesoft Inc.
            </a>{" "}
            2026. Expendit.{" "}
            <a
              href={CUELABS_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              CueLABS™ Division
            </a>
            .{" "}
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              MIT License
            </a>
            .
          </>
        }
        brand={
          <div>
            <div className="text-lg font-semibold tracking-tight text-text">
              expendit<span className="text-accent">.</span>
            </div>
            <p className="mt-2 text-[13px] text-text-2">
              Financial intelligence for modern growth.
            </p>
          </div>
        }
        meta={
          // The language selector is a real control (single locale in v1).
          <label className="flex items-center gap-2 text-[13px] text-text-2">
            <span className="sr-only">Language</span>
            <select
              aria-label="Language"
              defaultValue="en"
              className="rounded border border-border bg-bg px-2 py-1 text-[13px] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="en">English</option>
            </select>
          </label>
        }
      />
    </div>
  );
};

export default HomeView;
