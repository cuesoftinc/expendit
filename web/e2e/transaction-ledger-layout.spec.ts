import { expect, test } from "@playwright/test";

for (const width of [1024, 1279, 1280]) {
  test(`ledger columns and sticky header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto("/signin");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.waitForURL("**/dashboard");
    await page.goto("/dashboard/transactions");
    const ledger = page.getByRole("region", { name: "Ledger" });
    const header = ledger.locator("thead tr");
    const row = ledger.locator("tbody tr").first();
    await expect(row).toBeVisible();
    for (const index of [2, 3]) {
      const heading = await header.locator("th").nth(index).boundingBox();
      const cell = await row.locator("td").nth(index).boundingBox();
      expect(Math.abs(heading!.x - cell!.x)).toBeLessThanOrEqual(1);
    }
    const main = page.getByRole("main");
    expect(
      await main.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    expect(await ledger.evaluate((el) => getComputedStyle(el).overflowX)).toBe(
      "visible",
    );
    const headerBox = await header.boundingBox();
    const mainBox = await main.boundingBox();
    await main.evaluate(
      (el, distance) => {
        el.scrollTop += distance;
      },
      headerBox!.y - mainBox!.y + 100,
    );
    await expect
      .poll(async () => (await header.boundingBox())!.y)
      .toBeCloseTo(mainBox!.y, 0);
  });
}
