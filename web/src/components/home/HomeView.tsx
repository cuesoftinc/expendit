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
import HeroSection from "./HeroSection";
import { LogoStrip, PillarsSection } from "./PillarsSection";
import DeepDivesSection from "./DeepDivesSection";
import DemoSection from "./DemoSection";
import HowItWorksSection from "./HowItWorksSection";
import { AiSection, SecuritySection } from "./TrustSections";
import ContributeSection from "./ContributeSection";
import { CommunitySection, SelfHostSection } from "./SelfHostCommunity";
import { CompareSection, FaqSection, FinalCtaSection } from "./CompareFaqCta";
import {
  ANCHORS,
  scrollToAnchor,
  DISCORD_URL,
  DOCS_URL,
  GITHUB_URL,
  PRIVACY_HUB_URL,
  ROADMAP_URL,
  SECURITY_POLICY_URL,
} from "./links";

const NAV_LINKS = [
  { label: "Product", href: `#${ANCHORS.product}` },
  { label: "Docs", href: DOCS_URL },
  { label: "Community", href: `#${ANCHORS.community}` },
];

const SOLUTIONS = [
  { label: "Individuals", href: `#${ANCHORS.demo}` },
  { label: "SMEs", href: `#${ANCHORS.demo}` },
  { label: "Companies", href: `#${ANCHORS.demo}` },
];

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
    heading: "Resources",
    links: [
      { label: "Docs", href: DOCS_URL },
      { label: "GitHub", href: GITHUB_URL },
      { label: "Discord", href: DISCORD_URL },
      { label: "Roadmap", href: ROADMAP_URL },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: PRIVACY_HUB_URL },
      { label: "Terms", href: PRIVACY_HUB_URL },
      { label: "Data rights", href: PRIVACY_HUB_URL },
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

  const navProps = {
    links: NAV_LINKS,
    solutions: SOLUTIONS,
    githubHref: GITHUB_URL,
    onGithubClick: () => track("github_click", { source: "nav" }),
    onSignIn: () => router.push("/signin"),
    onTryCloud: () => tryCloud("nav"),
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
        note="© 2026 Cuesoft Inc."
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
        meta={<span className="text-[13px] text-text-2">English</span>}
      />
    </div>
  );
};

export default HomeView;
