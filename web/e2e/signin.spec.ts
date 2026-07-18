import { expect, test } from "@playwright/test";

/**
 * TEST_MODE smoke (web standard): /signin renders the single X-1 CTA and
 * "Continue with Google" lands straight on /dashboard (no Firebase).
 */

test("signin page shows the single Google CTA and no password fields", async ({
  page,
}) => {
  await page.goto("/signin");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  // X-1: no password inputs anywhere on the auth screen.
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
});

test("TEST_MODE: Continue with Google goes straight to /dashboard", async ({
  page,
}) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("retired password routes redirect to /signin", async ({ page }) => {
  for (const path of ["/signup", "/forgot-password", "/change-password"]) {
    await page.goto(path);
    await page.waitForURL("**/signin");
    await expect(page).toHaveURL(/\/signin$/);
  }
});
