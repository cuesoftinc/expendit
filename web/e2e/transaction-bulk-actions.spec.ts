import { expect, test } from "@playwright/test";

for (const action of [
  { method: "PUT", result: "re-categorized" },
  { method: "DELETE", result: "deleted" },
]) {
  test(`bulk ${action.method} reports partial failure and retries only the failed row`, async ({
    page,
  }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.waitForURL("**/dashboard");

    const requests: string[] = [];
    await page.route("**/api/mock/v1/transactions/*", async (route) => {
      if (route.request().method() !== action.method) return route.continue();
      requests.push(route.request().url());
      if (requests.length === 1) {
        await route.fulfill({ status: 500, json: { message: "Try again" } });
      } else if (action.method === "DELETE") {
        await route.fulfill({ status: 204 });
      } else {
        const response = await page.request.get(route.request().url(), {
          headers: await route.request().allHeaders(),
        });
        await route.fulfill({ response });
      }
    });

    await page.goto("/dashboard/transactions");
    await page
      .getByRole("checkbox", {
        name: /Select transaction Fuel — Total Admiralty, 9 Jul 2026/,
      })
      .check();
    await page
      .getByRole("checkbox", {
        name: /Select transaction Generator diesel — home office, 11 Jul 2026/,
      })
      .check();

    const toolbar = page.getByRole("toolbar", { name: "Bulk actions" });
    const submit = async () => {
      if (action.method === "DELETE") {
        await toolbar.getByRole("button", { name: "Delete selection" }).click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: /^Delete/ })
          .click();
      } else {
        await toolbar.getByRole("button", { name: "Re-categorize" }).click();
        const dialog = page.getByRole("dialog", { name: /Re-categorize/ });
        await dialog.getByRole("combobox", { name: "Category" }).click();
        await page.getByRole("option").first().click();
        await dialog.getByRole("button", { name: "Apply" }).click();
      }
    };

    await submit();
    await expect(
      page.getByText(`1 of 2 transactions ${action.result}.`, { exact: false }),
    ).toBeVisible();
    await expect(toolbar).toContainText("1 selected");

    await submit();
    await expect(
      page.getByText(`1 transaction ${action.result}`, { exact: true }),
    ).toBeVisible();
    await expect(toolbar).toHaveCount(0);
    expect(requests).toHaveLength(3);
    expect(requests[2]).toBe(requests[0]);
  });
}
