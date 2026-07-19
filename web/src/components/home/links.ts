/**
 * Home-page link register — every external destination the Part A
 * sections reference, in one place (no fabricated URLs: GitHub/docs come
 * from the repo + overview.md; Discord is the CueLABS™ ecosystem invite;
 * the privacy hub is the D3 ecosystem surface, architecture.md §2).
 */

import { prefersReducedMotion } from "@/lib/use-reduced-motion";

// Canonical inventory per the marketing nav/footer & theme parity canon
// (org SKILL.md, 2026-07-19) — all URLs verified 200.
export const GITHUB_URL = "https://github.com/cuesoftinc/expendit";
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;
export const CONTRIBUTING_URL = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`;
export const SECURITY_POLICY_URL = `${GITHUB_URL}/blob/main/SECURITY.md`;
export const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;
export const DOCS_URL = "https://cuesoft.gitbook.io/expendit";
export const QUICKSTART_URL = `${DOCS_URL}/setup`;
export const API_REFERENCE_URL = `${DOCS_URL}/system/api-surface`;
export const SELF_HOST_DOCS_URL = `${DOCS_URL}/system/deployment`;
export const ROADMAP_URL = `${DOCS_URL}/product/roadmap`;
export const DISCORD_URL = "https://discord.gg/CDfZxxrxbb";
export const CUELABS_URL = "https://cuelabs.cuesoft.io";
export const CUESOFT_URL = "https://cuesoft.io";
export const PRIVACY_HUB_URL = "https://privacy.cuesoft.io";
export const TERMS_URL = "https://terms.cuesoft.io";
export const STATUS_URL = "https://status.cuesoft.io";

/** Smooth-scrolls to a section anchor (no-op where unimplemented). */
export const scrollToAnchor = (id: string): void => {
  try {
    document.getElementById(id)?.scrollIntoView({
      // Instant jump under prefers-reduced-motion (design.md §5).
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  } catch {
    // jsdom (unit tests) has no scrollIntoView — navigation is cosmetic.
  }
};

/** In-page section anchors (A1 nav + CTA scroll targets). */
export const ANCHORS = {
  product: "product",
  demo: "demo",
  howItWorks: "how-it-works",
  contribute: "contribute",
  selfHost: "self-host",
  community: "community",
  compare: "compare",
  faq: "faq",
} as const;
