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

// DatePicker popover containment (2026-07-21 a11y audit): the open panel
// held role="dialog" but focus stayed on the trigger and Tab walked out
// into the page behind (6 of 14 tabs escaped). Probe shape: open → focus
// moved IN (the grammar input) → Tab cycles stay inside the dialog,
// wrapping at both edges → Escape closes AND restores the trigger.
test("date-picker popover moves focus in, contains Tab, and restores on Escape", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/transactions");

  const trigger = page.getByRole("button", { name: "All dates" });
  await trigger.click();
  const popover = page.getByRole("dialog", { name: "Pick range" });
  await expect(popover).toBeVisible();

  // Focus moved in on open — the grammar input is the first stop.
  await expect(
    popover.getByPlaceholder("YYYY-MM-DD..YYYY-MM-DD"),
  ).toBeFocused();

  // A full lap of Tab presses never leaves the dialog (the old probe saw
  // Search/Saved views take focus while the popover stayed open).
  for (let i = 0; i < 14; i += 1) {
    await page.keyboard.press("Tab");
    const inside = await popover.evaluate((node) =>
      node.contains(document.activeElement),
    );
    expect(inside, `Tab ${i + 1} stayed inside the popover`).toBe(true);
  }
  // Shift+Tab from the first control wraps to the last (Apply).
  await popover.getByRole("button", { name: "Previous month" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(popover.getByRole("button", { name: "Apply" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();
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
