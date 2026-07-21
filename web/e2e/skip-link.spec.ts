// Skip link (fleet canon P15, 2026-07-21 a11y audit): every route's FIRST
// Tab stop is a visually-hidden-until-focused "Skip to main content" link;
// activating it moves focus into <main id="main" tabIndex={-1}>, past the
// navigation chrome. Probe shape: load → Tab → link focused (and visible)
// → Enter → activeElement is the main landmark.
import { expect, test, type Page } from "@playwright/test";

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

const expectSkipLinkFlow = async (page: Page): Promise<void> => {
  // Reset the sequential-focus start point to the document top.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo(0, 0);
  });
  await page.keyboard.press("Tab");
  const link = page.getByRole("link", { name: "Skip to main content" });
  await expect(link).toBeFocused();
  await expect(link).toBeVisible();

  await page.keyboard.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLElement
          ? `${active.tagName.toLowerCase()}#${active.id}`
          : String(active?.tagName ?? "none");
      }),
    )
    .toBe("main#main");
};

test("home: first Tab is the skip link; activating focuses main", async ({
  page,
}) => {
  await page.goto("/");
  await expectSkipLinkFlow(page);
});

test("dashboard: first Tab is the skip link; activating focuses main", async ({
  page,
}) => {
  await signIn(page);
  // Fresh document load: the signin click leaves the browser's
  // sequential-focus start point on a disconnected node after the
  // client-side redirect — the skip link contract is about page loads.
  await page.goto("/dashboard");
  await expectSkipLinkFlow(page);
});

test("signin: first Tab is the skip link; activating focuses main", async ({
  page,
}) => {
  await page.goto("/signin");
  await expectSkipLinkFlow(page);
});
