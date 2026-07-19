import { expect, test } from "@playwright/test";

/**
 * W2 — "Marketing site" journey (design.md §8.4): the Part A scroll page
 * renders every section, the A5 persona tabs switch the demo datasets,
 * the FAQ opens one item at a time, and the CTAs hand off cross-page
 * into /signin. Runs in TEST_MODE (no network beyond the app).
 */

test.describe("public home `/` (Part A)", () => {
  test("all Part A sections render", async ({ page }) => {
    await page.goto("/");

    // A2 hero
    await expect(
      page.getByRole("heading", { name: "See every naira. File every tax." }),
    ).toBeVisible();
    // A3 logos strip
    await expect(page.getByText("Moniepoint")).toBeVisible();
    // A4 pillars + A4a deep-dives
    await expect(
      page.getByText("One ledger. Three superpowers."),
    ).toBeVisible();
    await expect(page.getByText("Every statement, one pipeline")).toBeVisible();
    // A5 demo + badge + A5a how-it-works
    await expect(page.getByText("Explore the live demo")).toBeVisible();
    await expect(page.getByText("This is demo data")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How it works" }),
    ).toBeVisible();
    // A6 AI disclosure + A7 security
    await expect(page.getByText("AI that shows its work")).toBeVisible();
    await expect(
      page.getByText("Security & privacy, in plain language"),
    ).toBeVisible();
    // A8 contribute (+ arch diagram) + A8a self-host snippet
    await expect(
      page.getByText("For developers — come build the hard parts"),
    ).toBeVisible();
    await expect(page.getByText("api · Go/Gin")).toBeVisible();
    await expect(
      page.getByText("Self-host: your books never leave your building"),
    ).toBeVisible();
    // A9 community + A10 comparison + caption
    await expect(
      page.getByRole("heading", { name: "Community", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Cloud or self-host — same product"),
    ).toBeVisible();
    await expect(
      page.getByText("Announced at GA", { exact: true }),
    ).toBeVisible();
    // A10a FAQ + A10b final CTA + A11 footer
    await expect(page.getByText("Questions, answered")).toBeVisible();
    await expect(
      page.getByText("Your numbers are ready to talk."),
    ).toBeVisible();
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "View Security Policy" }),
    ).toBeVisible();
  });

  test("A5: persona tabs switch the demo dataset", async ({ page }) => {
    await page.goto("/");
    // Scope to the A5 section — the A5a thumbs reuse the same demo pool.
    const demo = page.locator("#demo");
    // Freelancer boots (Figma A5 strip verbatim).
    await expect(demo.getByText("₦1,480,000.00")).toBeVisible();
    await expect(demo.getByText("MTN — data bundle top-up")).toBeVisible();

    await demo.getByRole("tab", { name: "SME" }).click();
    await expect(demo.getByText("₦4,150,000.00")).toBeVisible();
    await expect(demo.getByText("Retainer — Halcyon Studios")).toBeVisible();

    await demo.getByRole("tab", { name: "Company" }).click();
    await expect(demo.getByText("₦8,435,200.00")).toBeVisible();
    await expect(demo.getByText("Retainer — Kudaworks")).toBeVisible();
    await expect(demo.getByText("MTN — data bundle top-up")).toHaveCount(0);

    // demo_interact landed on the analytics queue (TEST_MODE seam).
    const events = await page.evaluate(() =>
      (
        window as unknown as { __expenditEvents?: { event: string }[] }
      ).__expenditEvents?.map((record) => record.event),
    );
    expect(events).toContain("page_view");
    expect(events).toContain("demo_interact");
  });

  test("A10a: FAQ toggles, one item open at a time", async ({ page }) => {
    await page.goto("/");
    const first = page.getByRole("button", {
      name: "Is it safe to connect my bank?",
    });
    // Default-open answer (Figma).
    await expect(
      page.getByText(/Bank sign-in happens inside Mono/),
    ).toBeVisible();

    await page.getByRole("button", { name: "What’s the license?" }).click();
    await expect(page.getByText(/MIT\. Cloud and self-host/)).toBeVisible();
    await expect(
      page.getByText(/Bank sign-in happens inside Mono/),
    ).toBeHidden();
    await expect(first).toHaveAttribute("aria-expanded", "false");

    const events = await page.evaluate(() =>
      (
        window as unknown as { __expenditEvents?: { event: string }[] }
      ).__expenditEvents?.map((record) => record.event),
    );
    expect(events).toContain("faq_open");
  });

  test("CTAs hand off into /signin (hero + nav + final CTA)", async ({
    page,
  }) => {
    await page.goto("/");
    // Hero Try Cloud (the A2 CTA — second Try Cloud on the page).
    await page.getByRole("button", { name: "Try Cloud" }).nth(1).click();
    await page.waitForURL("**/signin");
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();

    // Final CTA band re-emits the A2 handoff.
    await page.goto("/");
    await page.getByRole("button", { name: "Try Cloud" }).last().click();
    await page.waitForURL("**/signin");

    // Nav Sign in.
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/signin");
  });

  test("A2: Self Host CTA scrolls to the A8a section", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Self Host" }).first().click();
    await expect(page.locator("#self-host")).toBeInViewport();
  });

  test("renders at 375w (responsive floor)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "See every naira. File every tax." }),
    ).toBeVisible();
    await expect(page.getByText("Explore the live demo")).toBeVisible();
    // No horizontal overflow at the mobile floor.
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
