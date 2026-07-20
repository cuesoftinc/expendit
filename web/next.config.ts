import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained production server (.next/standalone/server.js)
  // for a small production Docker image.
  output: "standalone",
  // The floating dev indicator (a <nextjs-portal> overlay, bottom-left)
  // intercepts pointer events over the AppNav footer during local
  // `next dev` Playwright runs — CI runs `next start`, so this only
  // affects local e2e determinism.
  devIndicators: false,
};

export default nextConfig;
