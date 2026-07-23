import type { MetadataRoute } from "next";

/**
 * Web app manifest (SEO plumbing, fleet canon): product identity for
 * installs/add-to-home-screen, served at /manifest.webmanifest. Identity
 * mirrors the root layout metadata; colors are the design tokens
 * (design.md §2) — background is the default dark canvas (`--color-bg`,
 * key-absent theme default), theme the Expendit orange (`--color-accent`).
 * Icons are the committed brand assets from
 * scripts/generate-brand-assets.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Expendit",
    short_name: "Expendit",
    description: "See every naira. File every tax.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0c0e",
    theme_color: "#f46a1f",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32 48x48 256x256",
        type: "image/x-icon",
      },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
