// axe gate for the transactions ledger (2026-07-21 a11y audit): the
// row-select checkboxes shipped with NO accessible name — axe
// `button-name` critical ×50 on this surface (×5 on overview and the
// marketing home demo, which render the same TxnTableRow/TableHeader).
// The gate pins the blocker class at zero: no critical violations, and
// specifically no unnamed buttons/checkboxes, ever again. (Serious-level
// light-theme color-contrast is token work tracked separately — not
// gated here.)
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

test("transactions ledger has zero critical axe violations (button-name lock)", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/transactions");
  // Ledger rows rendered — the surface the ×50 finding came from.
  await expect(
    page.getByRole("checkbox", { name: /^Select transaction / }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Select all transactions" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(
    critical.map((violation) => `${violation.id} ×${violation.nodes.length}`),
  ).toEqual([]);
  expect(
    results.violations.find((violation) => violation.id === "button-name"),
  ).toBeUndefined();
});
