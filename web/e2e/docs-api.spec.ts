import { expect, test } from "@playwright/test";

/**
 * Public API reference (X-2) — /docs/api embeds the Scalar interactive
 * reference rendered from the repo's canonical OpenAPI document, served
 * at /docs/api/openapi.yaml. Public surface: no auth, marketing nav
 * chrome, reachable from the footer's Docs column.
 */
test.describe("API reference — /docs/api", () => {
  test("route 200s and Scalar renders operations from the spec", async ({
    page,
  }) => {
    const response = await page.goto("/docs/api");
    expect(response?.status()).toBe(200);

    // Marketing nav chrome is present on the public docs surface.
    await expect(
      page.getByRole("link", { name: "Star cuesoftinc/expendit on GitHub" }),
    ).toBeVisible();

    // Scalar hydrates client-side from /docs/api/openapi.yaml: the spec
    // title and a known operation summary (GET /api/v1/expenses) must
    // render.
    await expect(
      page.getByRole("heading", { name: "Expendit API" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("List expenses").first()).toBeVisible();
  });

  test("the OpenAPI document is served at /docs/api/openapi.yaml", async ({
    request,
  }) => {
    const response = await request.get("/docs/api/openapi.yaml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("openapi: 3.1.0");
    expect(body).toContain("title: Expendit API");
  });

  test("the footer API reference link navigates to /docs/api", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "API reference", exact: true })
      .click();
    await page.waitForURL("**/docs/api");
    await expect(
      page.getByRole("heading", { name: "Expendit API" }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
