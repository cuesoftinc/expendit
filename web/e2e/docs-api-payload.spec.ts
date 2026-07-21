import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Payload-budget lock for /docs/api (perf audit 2026-07-21, fleet P10):
 * the Scalar reference is ~1.3–1.4MB encoded / ~4.8MB decoded JS in every
 * product — shipped eagerly it made /docs/api the heaviest page of the
 * fleet. The diet gates the Scalar import on user intent (first gesture or
 * the explicit load button), so the settled pre-intent page costs only the
 * shell. This spec locks both halves: the shell stays under budget, AND
 * intent still mounts the full reference from the product's OpenAPI
 * document.
 *
 * This spec is BYTE-IDENTICAL across apparule/expendit/upstat (tooling
 * canon) — per-product expectations live in the config below keyed by
 * `package.json` name, the seo.spec.ts pattern.
 *
 * Budgets are the measured settled pre-intent encoded JS of the TEST_MODE
 * prod build (network-recorded, 2026-07-21) + 20% headroom. Before the
 * diet the same probe read 1381K (apparule), 1409K (expendit), 1378K
 * (upstat) encoded.
 */

interface PayloadProfile {
  /**
   * Encoded (transfer) JS budget in KiB for the settled, pre-intent
   * /docs/api page.
   */
  budgetKiB: number;
  /** Spec title Scalar must render once intent mounts the reference. */
  apiTitle: string;
}

const PRODUCTS: Record<string, PayloadProfile> = {
  apparule: { budgetKiB: 268, apiTitle: "Apparule API" },
  expendit: { budgetKiB: 303, apiTitle: "Expendit API" },
  upstat: { budgetKiB: 264, apiTitle: "Upstat HTTP API" },
};

const pkgName: string = JSON.parse(
  readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
).name;
const product = PRODUCTS[pkgName];

test("pre-intent /docs/api stays under the JS budget; intent still mounts the full reference", async ({
  page,
}) => {
  // Budgets are meaningful only against the prod build: CI builds
  // (TEST_MODE) and serves `next start`; local runs serve `next dev`,
  // whose unminified chunks would dwarf any production budget.
  test.skip(
    !process.env.CI,
    "payload budget is asserted against the prod build (CI harness)",
  );

  // Network-record encoded transfer sizes via CDP (chromium project).
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  const resources = new Map<
    string,
    { url: string; type: string; encoded: number }
  >();
  cdp.on("Network.responseReceived", (e) => {
    resources.set(e.requestId, {
      url: e.response.url,
      type: e.type,
      encoded: 0,
    });
  });
  cdp.on("Network.loadingFinished", (e) => {
    const r = resources.get(e.requestId);
    if (r) r.encoded = e.encodedDataLength;
  });

  // Settle WITHOUT any input event — no pointer, key, wheel, touch or
  // scroll — so the intent gate stays closed, then let stragglers land.
  await page.goto("/docs/api", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const js = [...resources.values()].filter((r) => r.type === "Script");
  const encodedKiB = js.reduce((sum, r) => sum + r.encoded, 0) / 1024;
  const worst = js
    .sort((a, b) => b.encoded - a.encoded)
    .slice(0, 5)
    .map((r) => `${(r.encoded / 1024).toFixed(1)}K ${new URL(r.url).pathname}`)
    .join("\n  ");
  expect(
    encodedKiB,
    `settled pre-intent JS ${encodedKiB.toFixed(1)}KiB must stay under ` +
      `${product.budgetKiB}KiB — heaviest:\n  ${worst}`,
  ).toBeLessThan(product.budgetKiB);

  // The gate must not fence off the reference itself: the first gesture
  // mounts the FULL Scalar reference, fetching the OpenAPI document.
  const specFetch = page.waitForResponse(
    (res) => res.url().includes("/docs/api/openapi.yaml") && res.ok(),
  );
  await page.mouse.move(12, 12);
  await specFetch;
  await expect(
    page.getByRole("heading", { name: product.apiTitle }),
  ).toBeVisible({ timeout: 30_000 });
});
