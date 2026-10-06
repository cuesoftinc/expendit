import { expect, test } from "@playwright/test";

test("create an income category without losing the transaction draft", async ({
  page,
}) => {
  const name = `Consulting ${Date.now()}`;
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/dashboard/transactions");
  await page.getByRole("button", { name: "New transaction" }).click();
  const editor = page.getByRole("dialog", { name: "New transaction" });
  await editor.getByRole("textbox", { name: "Description" }).fill(name);
  await editor.getByRole("textbox", { name: "Amount" }).fill("25000");
  await editor.getByRole("radio", { name: "Income", exact: true }).click();
  await editor.getByRole("combobox", { name: "Category" }).click();
  await editor.getByRole("option", { name: "Create category" }).click();
  const categoryEditor = page.getByRole("dialog", {
    name: "New category",
    exact: true,
  });
  await categoryEditor
    .getByRole("textbox", { name: "Name", exact: true })
    .fill(name);
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/categories") &&
      response.request().method() === "POST",
  );
  await categoryEditor
    .getByRole("button", { name: "Create", exact: true })
    .click();
  const response = await created;
  expect(response.status()).toBe(201);
  const category = await response.json();
  expect(category.type).toBe("income");
  await expect(
    editor.getByRole("textbox", { name: "Description" }),
  ).toHaveValue(name);
  await expect(editor.getByRole("textbox", { name: "Amount" })).toHaveValue(
    "25000",
  );
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/transactions") &&
      response.request().method() === "POST",
  );
  await editor.getByRole("button", { name: "Add transaction" }).click();
  const transactionResponse = await saved;
  expect(transactionResponse.status()).toBe(201);
  expect(await transactionResponse.json()).toMatchObject({
    description: name,
    category_id: category.id,
    direction: "income",
    amount: 25000,
  });
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "Ledger" }).getByText(name).first(),
  ).toBeVisible();
});
