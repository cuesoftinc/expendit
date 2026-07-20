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

test("signin carries the frame construction (Figma 178:19)", async ({
  page,
}) => {
  await page.goto("/signin");
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByText("Statements, ratios and taxes — one account."),
  ).toBeVisible();
  await expect(
    page.getByText("Google sign-in only — no passwords to manage."),
  ).toBeVisible();
});

test("TEST_MODE: Continue with Google goes straight to /dashboard", async ({
  page,
}) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("retired password routes 404 on the branded page", async ({ page }) => {
  for (const path of ["/signup", "/forgot-password", "/change-password"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "This page doesn’t add up." }),
    ).toBeVisible();
  }
});
