// axe gate for the marketing home (2026-07-21 closeout): the A8c tabbed
// snippet shipped Radix Tabs values carrying the display label — the
// "Docker Compose" space made aria-controls an invalid IDREF (axe
// `aria-valid-attr-value` critical). The gate pins the critical class at
// zero on `/` and locks the ARIA-attribute + name classes specifically,
// mirroring the transactions gate. (Serious-level light-theme
// color-contrast is token work tracked separately — not gated here.)
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The ARIA classes this gate locks at ANY impact level: broken IDREFs /
// required attributes (the CodeSnippet regression family) and unnamed
// buttons (the checkbox/icon-button family, fleet P6).
const LOCKED_RULES = [
  "aria-valid-attr-value",
  "aria-valid-attr",
  "aria-required-attr",
  "button-name",
  "td-has-header",
  "empty-table-header",
];

test("home has zero critical axe violations (ARIA IDREF + name lock)", async ({
  page,
}) => {
  await page.goto("/");
  // Mount the deferred below-fold demo panels (perf pass) so the scan
  // covers the full page: the IO gates fire on approach, so walk the
  // sections (an instant jump to the bottom would skip #demo), then
  // return to the top.
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("table", { name: "Demo transactions" }),
  ).toBeVisible();
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await page.locator("#self-host").scrollIntoViewIfNeeded();
  await expect(page.getByRole("tab", { name: "Docker Compose" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(
    critical.map((violation) => `${violation.id} ×${violation.nodes.length}`),
  ).toEqual([]);
  expect(
    results.violations
      .filter((violation) => LOCKED_RULES.includes(violation.id))
      .map((violation) => `${violation.id} ×${violation.nodes.length}`),
  ).toEqual([]);
});
