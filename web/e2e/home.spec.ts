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
      // level pins the A9 section h2 (the footer's Community column
      // heading arrived with the parity canon).
      page.getByRole("heading", { name: "Community", exact: true, level: 2 }),
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
    // Hero Try Cloud (the A2 CTA — the first Try Cloud BUTTON; the nav
    // Try Cloud is a link, canon revision 2026-07-19).
    await page.getByRole("button", { name: "Try Cloud" }).first().click();
    await page.waitForURL("**/signin");
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();

    // Final CTA band re-emits the A2 handoff.
    await page.goto("/");
    await page.getByRole("button", { name: "Try Cloud" }).last().click();
    await page.waitForURL("**/signin");

    // Nav Sign in — a real link to /signin (parity canon).
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Marketing" })
      .first()
      .getByRole("link", { name: "Sign in" })
      .click();
    await page.waitForURL("**/signin");
  });

  test("A2: Self Host CTA scrolls to the A8a section", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Self Host" }).first().click();
    await expect(page.locator("#self-host")).toBeInViewport();
  });

  test("one centered 1200px container aligns every band (1440 + 2400)", async ({
    page,
  }) => {
    // design.md §2 container pin [Decided 2026-07-19]: content x 120–1320
    // on the 1440 frame; the wide viewport is where drift shows clearest.
    for (const width of [1440, 2400]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const edges = await page.evaluate(() => {
        const boxes: { name: string; left: number; right: number }[] = [];
        for (const el of document.querySelectorAll("[data-section-inner]")) {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          boxes.push({
            name: `section-inner:${el.closest("section")?.id || "band"}`,
            left: rect.left + parseFloat(style.paddingLeft),
            right: rect.right - parseFloat(style.paddingRight),
          });
        }
        const navInner = document.querySelector(
          'nav[aria-label="Marketing"] > div',
        );
        const footerInner = document.querySelector("footer > div");
        for (const [name, el] of [
          ["nav", navInner],
          ["footer", footerInner],
        ] as const) {
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          boxes.push({ name, left: rect.left, right: rect.right });
        }
        return boxes;
      });
      expect(edges.length).toBeGreaterThanOrEqual(15);
      const expectedLeft = (width - 1200) / 2;
      for (const box of edges) {
        expect
          .soft(Math.abs(box.left - expectedLeft), `${box.name} left @${width}`)
          .toBeLessThanOrEqual(1);
        expect
          .soft(
            Math.abs(box.right - (width - expectedLeft)),
            `${box.name} right @${width}`,
          )
          .toBeLessThanOrEqual(1);
      }
    }
  });

  test("3-up card rows share the 384px/24px rhythm at 1440", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    // Pillars (A4) and demo stat cards (A5) — 384px cards, 24px gutters.
    const widths = await page.evaluate(() => {
      const rows = [
        document.querySelector("#product [data-section-inner] > div.grid"),
        document.querySelector("#demo .grid.sm\\:grid-cols-3"),
      ];
      return rows.flatMap((row) =>
        row
          ? [...row.children].map((card) =>
              Math.round(card.getBoundingClientRect().width),
            )
          : [],
      );
    });
    expect(widths.length).toBe(6);
    for (const width of widths) {
      expect(Math.abs(width - 384)).toBeLessThanOrEqual(1);
    }
  });

  test("landmarks + demo table semantics", async ({ page }) => {
    await page.goto("/");
    // Exactly one main and one h1; footer is the contentinfo.
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);

    // Demo table: a real <table> (W3 semantic refactor) whose rows
    // contain only cells / columnheaders — native or ARIA (live QA
    // 2026-07-19: rows were orphaned, cells bare).
    const table = page.getByRole("table", { name: "Demo transactions" });
    await expect(table).toBeVisible();
    expect(
      await table.getByRole("columnheader").count(),
    ).toBeGreaterThanOrEqual(4);
    expect(await table.getByRole("row").count()).toBeGreaterThanOrEqual(5);
    const orphanChildren = await table.evaluate(
      (node) =>
        [...node.querySelectorAll("tr,[role=row]")].filter((row) =>
          [...row.children].some(
            (cell) => !cell.matches("td,th,[role=cell],[role=columnheader]"),
          ),
        ).length,
    );
    expect(orphanChildren).toBe(0);

    // No row (native or ARIA) outside a table/grid context anywhere
    // non-decorative.
    const orphanRows = await page.evaluate(
      () =>
        [...document.querySelectorAll("tr,[role=row]")].filter(
          (row) =>
            !row.closest("[role=table],[role=grid],table") &&
            !row.closest("[inert]"),
        ).length,
    );
    expect(orphanRows).toBe(0);
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
