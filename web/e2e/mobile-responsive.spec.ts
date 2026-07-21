import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile responsiveness sweep (mobile canon, 2026-07-19): at 390 (and a
 * 768 sanity width) the document NEVER side-scrolls on the home page or
 * any dashboard route — wide surfaces (the ledger table, staged-review
 * table, statement grids, mapping review) scroll horizontally inside
 * their own containers, within the fixed viewport.
 *
 * Three assertions per route:
 *   1. document.scrollWidth fits the viewport (no page side-scroll);
 *   2. the <main> region never side-scrolls (dashboard content region);
 *   3. any element extending past the viewport sits inside a designated
 *      horizontal-scroll container that itself fits the viewport (or is
 *      clipped by an overflow-hidden ancestor, e.g. decorative art).
 */

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

const switchToCompanyOrg = async (page: Page, width: number): Promise<void> => {
  // Compact icon-only trigger on the mobile rail; labelled trigger on
  // the expanded desktop rail (same pattern as floating-layers.spec).
  const trigger =
    width < 768
      ? page.getByRole("button", { name: /^Organization:/ })
      : page.getByRole("button", { name: /Personal|Cuesoft/ }).first();
  await trigger.click();
  await page
    .getByRole("listbox", { name: "Organizations" })
    .getByRole("option", { name: /Cuesoft Ltd/ })
    .click();
};

interface OverflowReport {
  viewportWidth: number;
  docScrollWidth: number;
  mainOverflow: string | null;
  offenders: string[];
}

const auditOverflow = (page: Page): Promise<OverflowReport> =>
  page.evaluate(() => {
    const vw = window.innerWidth;
    const doc = document.documentElement;
    const report = {
      viewportWidth: vw,
      docScrollWidth: Math.max(doc.scrollWidth, document.body.scrollWidth),
      mainOverflow: null as string | null,
      offenders: [] as string[],
    };
    const main = document.querySelector("main");
    if (main && main.scrollWidth > main.clientWidth + 1) {
      report.mainOverflow = `main scrollWidth ${main.scrollWidth} > clientWidth ${main.clientWidth}`;
    }
    const isHScroller = (el: Element): boolean => {
      if (el.tagName === "MAIN") return false; // the page region itself never side-scrolls
      const style = getComputedStyle(el);
      return (
        (style.overflowX === "auto" || style.overflowX === "scroll") &&
        el.getBoundingClientRect().width <= vw + 1
      );
    };
    const isContained = (el: Element): boolean => {
      let cursor = el.parentElement;
      while (cursor) {
        if (isHScroller(cursor)) return true;
        const style = getComputedStyle(cursor);
        if (style.overflowX === "hidden" || style.overflowX === "clip") {
          return true; // clipped decorative overflow (e.g. hero art)
        }
        cursor = cursor.parentElement;
      }
      return false;
    };
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (getComputedStyle(el).position === "fixed") continue; // overlays clamp separately (floating-layers.spec)
      if (rect.right > vw + 1 || rect.left < -1) {
        if (isContained(el)) continue;
        report.offenders.push(
          `<${el.tagName.toLowerCase()}> [${Math.round(rect.left)}..${Math.round(
            rect.right,
          )}] class="${(el.getAttribute("class") ?? "").slice(0, 80)}"`,
        );
      }
    }
    report.offenders = report.offenders.slice(0, 5);
    return report;
  });

const expectNoOverflow = async (page: Page, route: string): Promise<void> => {
  const report = await auditOverflow(page);
  expect
    .soft(
      report.docScrollWidth,
      `${route}: document side-scrolls (${report.docScrollWidth} > ${report.viewportWidth})`,
    )
    .toBeLessThanOrEqual(report.viewportWidth + 1);
  expect
    .soft(report.mainOverflow, `${route}: ${report.mainOverflow}`)
    .toBeNull();
  expect
    .soft(
      report.offenders,
      `${route}: elements past the viewport outside scroll containers:\n${report.offenders.join("\n")}`,
    )
    .toEqual([]);
};

/** Personal-org routes, then company-org routes (statements need data). */
const PERSONAL_ROUTES = [
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/imports",
  "/dashboard/accounts",
  "/dashboard/reports",
  "/dashboard/categories",
  // routed registry tabs (2026-07-21): the Archive pane reflows too.
  "/dashboard/categories/archive",
  // routed settings tabs (2026-07-20): the bar itself must h-scroll in
  // the viewport, and every pane reflows — sweep all four sub-routes.
  "/dashboard/settings/organization",
  "/dashboard/settings/members",
  "/dashboard/settings/data-privacy",
  "/dashboard/settings/notifications",
];

const COMPANY_ROUTES = [
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/company",
  "/dashboard/company/ratios",
  "/dashboard/taxes",
  "/dashboard/taxes/file",
];

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  // ≥md the AppNav boots EXPANDED (240px) by default — these widths
  // sweep the narrowest expanded-nav content columns (canon 2026-07-19:
  // the content must reflow cleanly in both nav states).
  { width: 1024, height: 900 },
  { width: 1280, height: 900 },
]) {
  test.describe(`no horizontal overflow at ${viewport.width}`, () => {
    test.use({ viewport });

    test("home, signin and onboarding fit the viewport", async ({ page }) => {
      for (const route of ["/", "/signin", "/onboarding"]) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await expectNoOverflow(page, route);
      }
    });

    test("every dashboard route fits the viewport", async ({
      page,
      request,
    }) => {
      test.setTimeout(120_000);
      await signIn(page);

      for (const route of PERSONAL_ROUTES) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await expectNoOverflow(page, route);
      }

      await page.goto("/dashboard");
      await switchToCompanyOrg(page, viewport.width);
      for (const route of COMPANY_ROUTES) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await expectNoOverflow(page, route);
      }

      // Detail drill-ins: the seeded staged import job and a statement.
      const orgs = await request.get("/api/mock/orgs").then(
        (res) =>
          res.json() as Promise<{
            items: Array<{ id: string; kind: string }>;
          }>,
      );
      const companyOrg = orgs.items.find((org) => org.kind === "company");
      expect(companyOrg).toBeDefined();
      const headers = { "X-Org-Id": companyOrg!.id };

      const jobs = await request
        .get("/api/mock/import", { headers })
        .then((res) => res.json() as Promise<{ items: Array<{ id: string }> }>);
      if (jobs.items.length > 0) {
        const route = `/dashboard/imports/${jobs.items[0].id}`;
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await expectNoOverflow(page, route);
      }

      const statements = await request
        .get("/api/mock/statements", { headers })
        .then((res) => res.json() as Promise<{ items: Array<{ id: string }> }>);
      if (statements.items.length > 0) {
        const route = `/dashboard/company/statements/${statements.items[0].id}`;
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await expectNoOverflow(page, route);
      }
    });

    test("the ledger table scrolls within its container, not the page", async ({
      page,
    }) => {
      await signIn(page);
      await page.goto("/dashboard/transactions");
      await expect(page.locator("table tbody tr").first()).toBeVisible();
      const { containerScrolls, tableWiderThanViewport } = await page.evaluate(
        () => {
          const table = document.querySelector(
            "section[aria-label='Ledger'] table",
          );
          const container = table?.parentElement;
          if (!table || !container) {
            return { containerScrolls: false, tableWiderThanViewport: false };
          }
          return {
            containerScrolls:
              getComputedStyle(container).overflowX === "auto" &&
              container.scrollWidth > container.clientWidth,
            tableWiderThanViewport:
              table.getBoundingClientRect().width > window.innerWidth,
          };
        },
      );
      if (viewport.width === 390) {
        // At 390 the ledger is wider than the viewport and lives in a
        // horizontal scroll container (mobile canon).
        expect(tableWiderThanViewport).toBe(true);
        expect(containerScrolls).toBe(true);
      }
    });
  });
}

test.describe("mobile nav drawer (390)", () => {
  // Canon (2026-07-19): below md the AppNav rides the 64px rail;
  // EXPANSION opens an overlay drawer over a scrim — the content column
  // never reflows; the persisted expanded state applies only ≥md.
  test.use({ viewport: { width: 390, height: 844 } });

  test("expanding overlays a drawer — content width unchanged; scrim and Escape dismiss", async ({
    page,
  }) => {
    await signIn(page);
    const main = page.locator("main");
    const widthBefore = (await main.boundingBox())!.width;

    await page.getByRole("button", { name: "Expand navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation drawer" });
    await expect(drawer).toBeVisible();
    // Overlay, not reflow: the content column keeps its width.
    expect((await main.boundingBox())!.width).toBe(widthBefore);
    const drawerBox = (await drawer.boundingBox())!;
    expect(drawerBox.x).toBe(0);
    expect(drawerBox.width).toBeLessThan(390);
    // The drawer carries the labeled nav groups the rail hides.
    await expect(
      drawer.getByRole("link", { name: /^Transactions/ }),
    ).toBeVisible();

    // Escape closes and returns focus to the trigger.
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Expand navigation" }),
    ).toBeFocused();

    // Scrim tap closes too (click far right of the 240px panel).
    await page.getByRole("button", { name: "Expand navigation" }).click();
    await expect(drawer).toBeVisible();
    await page
      .getByTestId("nav-drawer-scrim")
      .click({ position: { x: 360, y: 420 } });
    await expect(drawer).not.toBeVisible();
  });

  test("drawer links navigate and dismiss the drawer", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Expand navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation drawer" });
    await drawer.getByRole("link", { name: "Reports" }).click();
    await page.waitForURL("**/dashboard/reports");
    await expect(drawer).not.toBeVisible();
  });

  test("a persisted expanded state boots collapsed at 390", async ({
    page,
  }) => {
    await signIn(page);
    // Simulate a desktop session that persisted the EXPANDED state.
    await page.evaluate(() =>
      window.localStorage.setItem("expendit.nav-collapsed", "0"),
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toHaveAttribute("data-collapsed", "true");
    await expect(
      page.getByRole("dialog", { name: "Navigation drawer" }),
    ).toHaveCount(0);
  });
});
