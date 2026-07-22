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

test("legal links point at the canonical Cuesoft policies", async ({
  page,
}) => {
  await page.goto("/signin");
  await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute(
    "href",
    "https://terms.cuesoft.io",
  );
  await expect(
    page.getByRole("link", { name: "Privacy Policy" }),
  ).toHaveAttribute("href", "https://privacy.cuesoft.io");
});

test("TEST_MODE: Continue with Google goes straight to /dashboard", async ({
  page,
}) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard$/);
});

/**
 * Cold-start matrix (flows/auth.md §2, ratified 2026-07-22): restore
 * resolves before either surface routes, and each surface guards its
 * wrong-state visitor.
 */
test("cold start signed out: /dashboard replaces to /signin with no dashboard paint", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/signin");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  // The dashboard never painted content for the signed-out visitor.
  await expect(page.getByTestId("overview-mid-band")).toHaveCount(0);
});

test("reverse guard: a signed-in visit to /signin is replaced to /dashboard", async ({
  page,
}) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  // Same tab (the TEST_MODE session is sessionStorage-held, per-tab):
  // /signin is not a reachable surface while signed in — the SignInGate
  // replaces to the app and the CTA never paints.
  await page.goto("/signin");
  await page.waitForURL("**/dashboard");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toHaveCount(0);
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
