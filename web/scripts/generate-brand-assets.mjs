/**
 * generate-brand-assets.mjs — brand/SEO asset generator (fleet-shared).
 *
 * Generates the App Router metadata assets from the product's brand
 * construction (design.md §2 tokens + the marketing wordmark), so the
 * committed binaries have reproducible provenance:
 *
 *   src/app/opengraph-image.png      1200×630 og/twitter card
 *   src/app/opengraph-image.alt.txt  alt text for the card
 *   src/app/favicon.ico              PNG-in-ICO 16/32/48/256
 *   src/app/apple-icon.png           180×180 apple-touch-icon
 *
 * Run manually (assets are committed, not built):
 *   node scripts/generate-brand-assets.mjs
 *
 * Type renders in Inter (the fleet family, landing-type canon). Font
 * resolution: $INTER_WOFF2 (path to any Inter variable woff2 — e.g. the
 * `.p.` latin file under web/.next/static/media after a build) or, when
 * unset, the official Inter distribution at rsms.me is fetched.
 *
 * This file is BYTE-IDENTICAL across apparule/expendit/upstat (tooling
 * canon): the engine is shared; the per-product section below is keyed by
 * `package.json` name. Raw hex is intentional here — assets are rendered
 * outside the app, so token custom properties are quoted by VALUE with
 * their token names in comments (same documented-exception rule as Figma).
 */

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const appDir = path.join(webRoot, "src", "app");

// lucide `zap` path (v1.25.0, ISC) — upstat's BrandMark glyph, rendered
// filled per the BrandMark construction (fill=currentColor, strokeWidth=0).
const ZAP_PATH =
  "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z";

const zapSvg = (color, cssSize) =>
  `<svg style="width:${cssSize};height:${cssSize};" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="${ZAP_PATH}"/></svg>`;

/* ------------------------------------------------------------------ */
/* Per-product configuration — keyed by web/package.json `name`.       */
/* Values quote the product's design tokens (names in comments).       */
/* ------------------------------------------------------------------ */

const PRODUCTS = {
  apparule: {
    displayName: "Apparule",
    tagline: "Two photos. A perfect fit.",
    og: {
      background: "#ffffff", // --ap-bg (light, the design default)
      taglineColor: "#111111", // --ap-text
      // The mark IS the gradient wordmark (marketing nav construction).
      brandHtml: `<span style="font-size:120px;font-weight:700;letter-spacing:-2px;background:linear-gradient(135deg,#e1306c,#f77737);-webkit-background-clip:text;background-clip:text;color:transparent;">Apparule</span>`, // --ap-accent-gradient
    },
    tile: {
      background: "linear-gradient(135deg,#e1306c,#f77737)", // --ap-accent-gradient
      markHtml: `<span style="color:#ffffff;font-weight:700;font-size:62cqmin;line-height:1;">A</span>`, // --ap-on-accent
    },
  },
  expendit: {
    displayName: "Expendit",
    tagline: "See every naira. File every tax.",
    og: {
      background: "#0c0c0e", // --color-bg-editorial (both themes)
      taglineColor: "#a0a0a8", // --color-text-2 (dark)
      // "expendit·" — the Wordmark component: accent dot is part of the mark.
      brandHtml: `<span style="font-size:120px;font-weight:700;letter-spacing:-3px;color:#f5f5f6;">expendit<span style="color:#f46a1f;">.</span></span>`, // --color-text (dark) / --color-accent
    },
    tile: {
      background: "#0c0c0e", // --color-bg-editorial
      markHtml: `<span style="color:#f5f5f6;font-weight:700;font-size:70cqmin;line-height:1;">e<span style="color:#f46a1f;">.</span></span>`, // --color-text (dark) / --color-accent
    },
  },
  upstat: {
    displayName: "Upstat",
    tagline: "All your telemetry. One open platform.",
    og: {
      background: "#0e1113", // --color-bg (dark, the design default)
      taglineColor: "#9ba0ac", // --color-text-2
      // BrandMark: filled bolt + lowercase wordmark.
      brandHtml: `<span style="display:inline-flex;align-items:center;gap:28px;">${zapSvg("#00e09e", "104px")}<span style="font-size:120px;font-weight:600;letter-spacing:-2px;color:#edeef2;">upstat</span></span>`, // --color-brand / --color-text
    },
    tile: {
      background: "#0e1113", // --color-bg
      markHtml: zapSvg("#00e09e", "62cqmin"), // --color-brand
    },
  },
};

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

const INTER_URL = "https://rsms.me/inter/font-files/InterVariable.woff2";

async function resolveInter(workDir) {
  const dest = path.join(workDir, "inter.woff2");
  if (process.env.INTER_WOFF2) {
    writeFileSync(dest, readFileSync(process.env.INTER_WOFF2));
    return dest;
  }
  const res = await fetch(INTER_URL);
  if (!res.ok) {
    throw new Error(
      `Inter fetch failed (${res.status}) — pass INTER_WOFF2=<path to an Inter variable woff2>`,
    );
  }
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

const pageShell = (fontUrl, body) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face {
  font-family: "Inter";
  src: url("${fontUrl}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
}
* { margin: 0; box-sizing: border-box; }
html, body { background: transparent; }
body {
  font-family: "Inter", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.og {
  width: 1200px; height: 630px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 36px;
}
.tile {
  position: fixed; top: 0; left: 0;
  display: flex; align-items: center; justify-content: center;
  container-type: size;
}
</style></head><body>${body}</body></html>`;

const ogBody = (p) =>
  `<div class="og" style="background:${p.og.background};">${p.og.brandHtml}<div style="font-size:42px;font-weight:500;color:${p.og.taglineColor};">${p.tagline}</div></div>`;

const tileBody = (p, size, radius) =>
  `<div class="tile" style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${p.tile.background};">${p.tile.markHtml}</div>`;

/** Pack PNG buffers into a .ico container (PNG-in-ICO, 32bpp entries). */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = [];
  for (const { size, buf } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.buf)]);
}

async function main() {
  const pkg = JSON.parse(
    readFileSync(path.join(webRoot, "package.json"), "utf8"),
  );
  const product = PRODUCTS[pkg.name];
  if (!product) throw new Error(`No brand config for package "${pkg.name}"`);

  const workDir = mkdtempSync(path.join(tmpdir(), "brand-assets-"));
  const fontPath = await resolveInter(workDir);
  const fontUrl = `file://${fontPath}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const shoot = async (body, clip) => {
    const file = path.join(workDir, `render-${clip.width}x${clip.height}.html`);
    writeFileSync(file, pageShell(fontUrl, body));
    await page.goto(`file://${file}`);
    await page.evaluate(() => document.fonts.ready);
    return page.screenshot({ clip, omitBackground: true });
  };

  // 1) opengraph-image.png — 1200×630 card.
  const og = await shoot(ogBody(product), {
    x: 0,
    y: 0,
    width: 1200,
    height: 630,
  });
  writeFileSync(path.join(appDir, "opengraph-image.png"), og);
  writeFileSync(
    path.join(appDir, "opengraph-image.alt.txt"),
    `${product.displayName} — ${product.tagline}\n`,
  );

  // 2) favicon.ico — rounded-square tile at 16/32/48/256 (PNG-in-ICO).
  const faviconPngs = [];
  for (const size of [16, 32, 48, 256]) {
    const buf = await shoot(tileBody(product, size, Math.round(size * 0.2)), {
      x: 0,
      y: 0,
      width: size,
      height: size,
    });
    faviconPngs.push({ size, buf });
  }
  writeFileSync(path.join(appDir, "favicon.ico"), packIco(faviconPngs));

  // 3) apple-icon.png — 180×180 full-bleed square (iOS applies the mask).
  const apple = await shoot(tileBody(product, 180, 0), {
    x: 0,
    y: 0,
    width: 180,
    height: 180,
  });
  writeFileSync(path.join(appDir, "apple-icon.png"), apple);

  await browser.close();

  for (const rel of ["opengraph-image.png", "favicon.ico", "apple-icon.png"]) {
    const buf = readFileSync(path.join(appDir, rel));
    const sha = createHash("sha256").update(buf).digest("hex");
    console.log(`${rel}  ${buf.length}B  sha256 ${sha}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
