/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // The floating dev indicator (a <nextjs-portal> overlay, bottom-left)
  // intercepts pointer events over the AppNav footer during local
  // `next dev` Playwright runs — CI runs `next start`, so this only
  // affects local e2e determinism.
  devIndicators: false,
};

module.exports = nextConfig;
