import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * B8 merge tool (user report): the "Merge into" Select rendered its
 * absolute menu inside the modal body's overflow — a raw inner
 * scrollbox with clipped rows. The menu now portals to <body>
 * (data-floating-layer), stays modal-safe (picking an option must not
 * dismiss the dialog), keeps the Select master's padded rows, caps its
 * height with internal scroll, and the merge completes end-to-end.
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

test("merge modal: portaled dropdown is unclipped, height-capped, and the merge completes", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/categories");
  await page.getByRole("button", { name: "Merge" }).first().click();

  const dialog = page.getByRole("dialog", { name: /^Merge/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").click();

  // The menu escaped the modal body: full panel in-viewport, first row
  // fully inside the panel (no half-clipped rows), height capped by the
  // Select master's max-h-56 listbox (+ panel chrome).
  const panel = page.locator("[data-floating-layer]");
  await expect(panel).toBeVisible();
  await expectFullyInViewport(panel);
  const panelBox = await panel.boundingBox();
  const firstOption = panel.getByRole("option").first();
  await expect(firstOption).toBeVisible();
  const optionBox = await firstOption.boundingBox();
  expect(optionBox!.y).toBeGreaterThanOrEqual(panelBox!.y);
  expect(optionBox!.y + optionBox!.height).toBeLessThanOrEqual(
    panelBox!.y + panelBox!.height + 1,
  );
  expect(panelBox!.height).toBeLessThanOrEqual(236);

  // Picking inside the portaled menu must not dismiss the dialog
  // (Modal's outside-interaction guard).
  await firstOption.click();
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Merge", exact: true }).click();
  await expect(page.getByText(/Merged into/)).toBeVisible({
    timeout: 15_000,
  });
});
