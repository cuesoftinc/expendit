// Overlay focus-restore canon (2026-07-21 a11y audit, fleet finding P4):
// closing any Modal/command-palette must return focus to the element that
// opened it. The palette opens programmatically (⌘K) and modals are
// controlled Radix dialogs without a Radix Trigger, so before the fix
// Escape dropped focus on <body>. Probe shape: open → move focus inside →
// Escape → overlay closed AND focus is back on the trigger.
import { expect, test, type Page } from "@playwright/test";

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

test("command palette returns focus to the pre-open element on Escape", async ({
  page,
}) => {
  await signIn(page);
  const anchor = page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: /^Transactions/ });
  await anchor.focus();
  await expect(anchor).toBeFocused();

  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();

  // Move focus off the search input and onto an option before dismissing.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");

  await expect(palette).toBeHidden();
  await expect(anchor).toBeFocused();
});

test("merge modal returns focus to its trigger on Escape", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/categories");
  const trigger = page.getByRole("button", { name: "Merge" }).first();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: /^Merge/ });
  await expect(dialog).toBeVisible();
  // Announced as modal (fleet parity with the apparule Sheet fix).
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
