import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Pick-or-type period fields (design.md §8.2b as built): the PeriodPicker
 * panel embeds the mode's grid — Overview month mode gets the 12-month
 * grid — and picking applies the value and refires the query (the donut
 * card re-titles to the picked month). The open panel obeys the master's
 * collision contract (467:11039) at desktop (1440×900), a short desktop
 * (1440×700) and mobile (390): fully in-viewport, and the document
 * never gains scroll height from an open popover (user report — the
 * panel "broke the page" past the layout bottom).
 */

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

const expectFullyInViewport = async (locator: Locator): Promise<void> => {
  const box = await locator.boundingBox();
  const viewport = locator.page().viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
};

const scrollHeights = (page: Page) =>
  page.evaluate(() => ({
    doc: document.documentElement.scrollHeight,
    body: document.body.scrollHeight,
  }));

for (const viewport of [
  { width: 1440, height: 900 },
  // Short desktop: the popover must flip/cap rather than push the page.
  { width: 1440, height: 700 },
  { width: 390, height: 844 },
]) {
  test.describe(`date picker at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("overview month switch: pick June in the grid → value applied and the query refires", async ({
      page,
    }) => {
      await signIn(page);
      // Seeded ledger runs through July 2026 — the donut starts there.
      await expect(
        page.getByText(/Expenses by category — Jul 2026/),
      ).toBeVisible({ timeout: 15_000 });

      const closedHeights = await scrollHeights(page);
      const trigger = page.locator('button[aria-haspopup="dialog"]').first();
      await trigger.click();
      const popover = page.getByRole("dialog", { name: "Pick month" });
      await expect(popover).toBeVisible();

      // Collision canon: the panel (now carrying the 12-month grid and
      // the grammar input) sits fully inside the viewport, and the open
      // popover never grows the document (no scrollbar, no layout push).
      await expect(
        popover.getByRole("button", { name: "July 2026" }),
      ).toBeVisible();
      await expect(
        popover.getByRole("button", { name: "Apply" }),
      ).toBeVisible();
      await expectFullyInViewport(popover);
      expect(await scrollHeights(page)).toEqual(closedHeights);

      // Pick June 2026 in the grid: the popover closes, the trigger
      // takes the humanized value, and the category query refires.
      await popover.getByRole("button", { name: "June 2026" }).click();
      await expect(popover).not.toBeVisible();
      await expect(trigger).toContainText("Jun 2026");
      await expect(
        page.getByText(/Expenses by category — Jun 2026/),
      ).toBeVisible({ timeout: 15_000 });
    });

    test("typing stays live alongside the grid (pick-or-type)", async ({
      page,
    }) => {
      await signIn(page);
      await page.locator('button[aria-haspopup="dialog"]').first().click();
      const popover = page.getByRole("dialog", { name: "Pick month" });
      const input = popover.getByPlaceholder("YYYY-MM");
      await input.fill("2026-05");
      // A valid typed draft drives the grid selection before Apply.
      await expect(
        popover.getByRole("button", { name: "May 2026" }),
      ).toHaveAttribute("aria-pressed", "true");
      await input.press("Enter");
      await expect(popover).not.toBeVisible();
      await expect(
        page.getByText(/Expenses by category — May 2026/),
      ).toBeVisible({ timeout: 15_000 });
    });
  });
}
