import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained production server (.next/standalone/server.js)
  // for a small production Docker image.
  output: "standalone",
  // The dev indicator's default bottom-left position sits over the AppNav
  // footer during local `next dev` Playwright runs (CI runs `next start`,
  // so this only affects local e2e determinism) — bottom-right is empty
  // app chrome, so the indicator stays without overlapping content.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
