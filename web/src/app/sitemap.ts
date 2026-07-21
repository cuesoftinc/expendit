import type { MetadataRoute } from "next";

/**
 * Public marketing surface only (SEO plumbing, fleet canon): the home page
 * and the public Scalar API reference. Auth (/signin), onboarding and app
 * (/dashboard/*) routes stay out by design.
 */
const BASE = "https://expendit.cuesoft.io";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/docs/api`, changeFrequency: "weekly", priority: 0.5 },
  ];
}
