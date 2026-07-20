import { expect, test, type Page } from "@playwright/test";

/**
 * B9 routed settings tabs (user-ratified 2026-07-20): four REAL
 * sub-routes under /dashboard/settings — Organization | Members |
 * Data & privacy | Notifications. Tab clicks change the URL and swap
 * the pane, deep links direct-load a tab, the bare route redirects to
 * the first tab, back/forward retrace the tab trail, the AppNav entry
 * stays highlighted across sub-routes, and the bar h-scrolls inside
 * the viewport on mobile.
 */

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

const tablist = (page: Page) =>
  page.getByRole("tablist", { name: "Settings sections" });

test("bare /dashboard/settings redirects to the first tab", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/settings");
  await page.waitForURL("**/dashboard/settings/organization");

  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeVisible();
  await expect(tablist(page).getByRole("tab")).toHaveText([
    "Organization",
    "Members",
    "Data & privacy",
    "Notifications",
  ]);
  await expect(
    tablist(page).getByRole("tab", { name: "Organization" }),
  ).toHaveAttribute("aria-current", "page");
});

test("tab click changes the URL and swaps the pane; back/forward retrace", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/settings");
  await page.waitForURL("**/dashboard/settings/organization");
  await expect(
    page.getByRole("region", { name: "Organization profile" }),
  ).toBeVisible();

  // click → URL changes, pane swaps, aria-current moves
  await tablist(page).getByRole("tab", { name: "Data & privacy" }).click();
  await page.waitForURL("**/dashboard/settings/data-privacy");
  await expect(
    page.getByRole("region", { name: "Export all data (USR-001)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Organization profile" }),
  ).not.toBeVisible();
  await expect(
    tablist(page).getByRole("tab", { name: "Data & privacy" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    tablist(page).getByRole("tab", { name: "Organization" }),
  ).toHaveAttribute("aria-selected", "false");

  await tablist(page).getByRole("tab", { name: "Notifications" }).click();
  await page.waitForURL("**/dashboard/settings/notifications");
  await expect(page.getByText("Deadline reminders")).toBeVisible();

  // browser history retraces the tab trail
  await page.goBack();
  await page.waitForURL("**/dashboard/settings/data-privacy");
  await expect(
    page.getByRole("region", { name: "Export all data (USR-001)" }),
  ).toBeVisible();
  await page.goBack();
  await page.waitForURL("**/dashboard/settings/organization");
  await expect(
    page.getByRole("region", { name: "Organization profile" }),
  ).toBeVisible();
  await page.goForward();
  await page.waitForURL("**/dashboard/settings/data-privacy");
  await expect(
    tablist(page).getByRole("tab", { name: "Data & privacy" }),
  ).toHaveAttribute("aria-current", "page");
});

test("deep link direct-loads a tab; AppNav stays highlighted on sub-routes", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard/settings/notifications");
  await page.waitForURL("**/dashboard/settings/notifications");

  await expect(
    tablist(page).getByRole("tab", { name: "Notifications" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Import summaries")).toBeVisible();

  // AppNav's Settings entry marks the current page across sub-routes
  await expect(
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: /^Settings/ }),
  ).toHaveAttribute("aria-current", "page");
});

test("mobile: the tab bar scrolls horizontally inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/dashboard/settings/organization");
  await page.waitForURL("**/dashboard/settings/organization");

  const list = tablist(page);
  await expect(list).toBeVisible();
  const report = await list.evaluate((el) => ({
    overflowX: getComputedStyle(el).overflowX,
    withinViewport: el.getBoundingClientRect().width <= window.innerWidth + 1,
    docSideScroll:
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) >
      window.innerWidth + 1,
  }));
  expect(report.overflowX).toBe("auto");
  expect(report.withinViewport).toBe(true);
  expect(report.docSideScroll).toBe(false);

  // the last tab is reachable by scrolling the bar itself
  const last = list.getByRole("tab", { name: "Notifications" });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
});
