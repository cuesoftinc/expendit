import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Floating-layer viewport collision (system QA 2026-07-19): the Overview
 * month popover (w-36 trigger at the header's right edge, min-w-56
 * left-anchored panel) overflowed the right viewport edge at 1440 and
 * clipped its Apply button. Every clamped bespoke layer — PeriodPicker,
 * OrgSwitcher, CategoryChip — must sit fully inside the viewport at
 * desktop (1440) and mobile (390) wherever its trigger is anchored.
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

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`floating layers at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("period-picker popover stays fully within the viewport", async ({
      page,
    }) => {
      await signIn(page);
      // The Overview header period picker is the page's only
      // aria-haspopup="dialog" trigger.
      await page.locator('button[aria-haspopup="dialog"]').first().click();
      const popover = page.getByRole("dialog", { name: "Pick month" });
      await expect(popover).toBeVisible();
      await expect(
        popover.getByRole("button", { name: "Apply" }),
      ).toBeVisible();
      await expectFullyInViewport(popover);
    });

    test("org switcher menu stays fully within the viewport", async ({
      page,
    }) => {
      await signIn(page);
      // Expanded rail trigger on desktop; compact icon-only (labelled
      // "Organization: …") on the mobile rail.
      const trigger =
        viewport.width < 768
          ? page.getByRole("button", { name: /^Organization:/ })
          : page.getByRole("button", { name: /Personal|Cuesoft/ }).first();
      await trigger.click();
      const menu = page.getByRole("listbox", { name: "Organizations" });
      await expect(menu).toBeVisible();
      await expectFullyInViewport(menu);
    });

    test("category chip combobox menu stays fully within the viewport", async ({
      page,
    }) => {
      await signIn(page);
      await page.goto("/dashboard/transactions");
      const chip = page
        .locator('tbody button[aria-haspopup="listbox"]')
        .first();
      await chip.click();
      // The menu panel wraps the listbox (the panel carries the border
      // box that must not clip).
      const panel = page.locator("#category-chip-listbox").locator("..");
      await expect(panel).toBeVisible();
      await expectFullyInViewport(panel);
    });
  });
}
