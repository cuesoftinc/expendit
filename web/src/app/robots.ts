import type { MetadataRoute } from "next";

/**
 * Crawl policy (SEO plumbing, fleet canon): the public marketing surface
 * is crawlable; the authed app shell and API routes are fenced off.
 */
const BASE = "https://expendit.cuesoft.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api"] }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
