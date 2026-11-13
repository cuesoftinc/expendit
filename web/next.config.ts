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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "form-action 'self' https://accounts.google.com",
              // Next.js hydration and the pre-paint theme bootstrap use inline scripts.
              "script-src 'self' 'unsafe-inline' https://accounts.google.com https://accounts.gstatic.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.github.com https://accounts.google.com",
            ].join("; "),
          },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
