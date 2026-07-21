import { expect, test, type Page } from "@playwright/test";

/**
 * B8 categories Archive tab (ratified 2026-07-21): archive is a quiet,
 * reversible row action — the row moves to the routed Archive tab
 * (/dashboard/categories/archive, deep-linkable) and comes back on
 * Unarchive. The spec creates its own category and deletes it at the
 * end, leaving the shared mock narrative untouched for later specs.
 */

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

/** The archived seed narrative lives on the Cuesoft org (B8b frame). */
const switchToCompanyOrg = async (page: Page): Promise<void> => {
  const trigger = page.getByRole("button", { name: /Personal|Cuesoft/ });
  await trigger.first().click();
  await page
    .getByRole("listbox", { name: "Organizations" })
    .getByRole("option", { name: /Cuesoft Ltd/ })
    .click();
};

test("archive journey: archive → Archive tab → unarchive returns it", async ({
  page,
}) => {
  await signIn(page);
  await switchToCompanyOrg(page);
  await page.goto("/dashboard/categories");

  // Routed tab bar, Active selected on the bare route.
  const tablist = page.getByRole("tablist", {
    name: "Category registry views",
  });
  await expect(tablist).toBeVisible();
  await expect(page.getByRole("tab", { name: "Active" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // Own fixture: create a category so the seed narrative stays intact.
  await page.getByRole("button", { name: "New category" }).click();
  await page.getByLabel("Name").fill("Legacy fleet");
  await page.getByRole("button", { name: "Create" }).click();
  const row = page.locator("li", { hasText: "Legacy fleet" });
  await expect(row).toBeVisible();

  // Quiet archive — no confirm dialog, just the toast.
  await row.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByText('"Legacy fleet" archived — find it under Archive'),
  ).toBeVisible();
  await expect(row).toHaveCount(0);

  // The Archive tab is a real link route.
  await page.getByRole("tab", { name: "Archive" }).click();
  await page.waitForURL("**/dashboard/categories/archive");
  await expect(page.getByRole("tab", { name: "Archive" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // Absolute-date meta (finance idiom) — the mock clock's "today".
  const archivedRow = page.locator("li", { hasText: "Legacy fleet" });
  await expect(archivedRow).toContainText("Archived 20 Jul 2026");
  // Seeded archive narrative renders alongside.
  await expect(
    page.locator("li", { hasText: "Conferences & travel" }),
  ).toContainText("Archived 14 Mar 2026 · 0 transactions this year");

  // Unarchive returns the row to the active registry.
  await archivedRow.getByRole("button", { name: "Unarchive" }).click();
  await expect(
    page.getByText('"Legacy fleet" restored to the active registry'),
  ).toBeVisible();
  await expect(archivedRow).toHaveCount(0);

  await page.getByRole("tab", { name: "Active" }).click();
  await page.waitForURL("**/dashboard/categories");
  const restored = page.locator("li", { hasText: "Legacy fleet" });
  await expect(restored).toBeVisible();

  // Cleanup: delete the fixture category (0 txns → immediate delete).
  await restored.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog", { name: /^Delete/ })
    .getByRole("button", { name: "Delete category" })
    .click();
  await expect(page.getByText("Category deleted")).toBeVisible();
  await expect(restored).toHaveCount(0);
});

test("archive tab deep-links", async ({ page }) => {
  await signIn(page);
  await switchToCompanyOrg(page);
  await page.goto("/dashboard/categories/archive");

  await expect(page.getByRole("tab", { name: "Archive" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("region", { name: "Archived categories" }),
  ).toBeVisible();
  await expect(
    page.locator("li", { hasText: "Print & stationery" }),
  ).toContainText("Archived 5 Jan 2026");
  // The dashboard nav keeps Categories highlighted on the sub-route.
  await expect(
    page.getByRole("link", { name: "Categories" }),
  ).toHaveAttribute("aria-current", "page");
});
