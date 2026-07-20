import { expect, test, type Page } from "@playwright/test";

/**
 * Marketing nav/footer & theme parity canon (org SKILL.md, 2026-07-19):
 * canonical link inventory on the A1 nav + A11 footer, and the
 * ThemeProvider contract (2026-07-20 tri-state: data-theme on <html>
 * always carries the RESOLVED theme; localStorage `expendit.theme`, key
 * absent = dark, expendit's design default; "system" stored explicitly)
 * cycling + persisting on home AND dashboard.
 */

const GITHUB = "https://github.com/cuesoftinc/expendit";
const DOCS = "https://cuesoft.gitbook.io/expendit";

const STAR_NAME = "Star cuesoftinc/expendit on GitHub";

// The GitHub item renders as the star badge (canon revision 2026-07-19);
// its accessible name is the badge aria-label.
const NAV_LINKS: Array<[string, string]> = [
  ["Features", "#product"],
  ["Pricing", "#compare"],
  ["Docs", DOCS],
  [STAR_NAME, GITHUB],
];

const FOOTER_LINKS: Array<[string, string, string]> = [
  // [column, label, href]
  ["Product", "Features", "#product"],
  ["Product", "Pricing", "#compare"],
  ["Product", "Try Cloud", "/signin"],
  ["Product", "Self Host", "#self-host"],
  ["Docs", "Docs", DOCS],
  ["Docs", "Quickstart", `${DOCS}/setup`],
  // In-product Scalar reference (X-2) — /docs/api renders the spec.
  ["Docs", "API reference", "/docs/api"],
  ["Docs", "Self-host guide", `${DOCS}/system/deployment`],
  ["Community", "GitHub", GITHUB],
  ["Community", "Discord", "https://discord.gg/CDfZxxrxbb"],
  ["Community", "Roadmap", `${DOCS}/product/roadmap`],
  ["Community", "CueLABS™", "https://cuelabs.cuesoft.io"],
  ["Legal", "Privacy", "https://privacy.cuesoft.io"],
  ["Legal", "Terms", "https://terms.cuesoft.io"],
  ["Legal", "Status", "https://status.cuesoft.io"],
];

test("nav carries the canonical 4 links + Sign in + Try Cloud CTA", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Marketing" }).first();
  for (const [label, href] of NAV_LINKS) {
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute(
      "href",
      href,
    );
  }
  // TEST_MODE: the star badge stays neutral — no hardcoded count.
  await expect(nav.getByRole("link", { name: STAR_NAME })).toHaveText("Star");
  await expect(nav.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/signin",
  );
  await expect(nav.getByRole("link", { name: "Try Cloud" })).toHaveAttribute(
    "href",
    "/signin",
  );

  // Cursor affordance canon [Directive 2026-07-19]: pointer on enabled
  // controls and links.
  const cursorOf = (locator: ReturnType<typeof nav.getByRole>) =>
    locator.evaluate((el) => getComputedStyle(el).cursor);
  expect(
    await cursorOf(nav.getByRole("button", { name: /^Theme: .* — switch to/ })),
  ).toBe("pointer");
  expect(await cursorOf(nav.getByRole("link", { name: "Docs" }))).toBe(
    "pointer",
  );
});

test("footer carries the 4-column canonical inventory + legal bar", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.locator("footer");
  for (const [column, label, href] of FOOTER_LINKS) {
    const nav = footer.getByRole("navigation", { name: column });
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute(
      "href",
      href,
    );
  }
  // Legal bar: verbatim line with linked Cuesoft Inc. + MIT License,
  // Security Policy CTA to SECURITY.md, and a real language control.
  await expect(
    footer.getByText(/© Cuesoft Inc\. 2026\. Expendit\. CueLABS™ Division\./),
  ).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Cuesoft Inc." }),
  ).toHaveAttribute("href", "https://cuesoft.io");
  await expect(
    footer.getByRole("link", { name: "CueLABS™ Division" }),
  ).toHaveAttribute("href", "https://cuelabs.cuesoft.io");
  await expect(
    footer.getByRole("link", { name: "MIT License" }),
  ).toHaveAttribute("href", `${GITHUB}/blob/main/LICENSE`);
  await expect(
    footer.getByRole("link", { name: "View Security Policy" }),
  ).toHaveAttribute("href", `${GITHUB}/blob/main/SECURITY.md`);
  await expect(footer.getByRole("combobox", { name: "Language" })).toHaveValue(
    "en",
  );
});

test("mobile (390w): the footer stacks brand → 2-col link grid → legal bar with grouped utilities", async ({
  page,
}) => {
  // Footer mobile-structure canon (org SKILL.md, 2026-07-19): brand block
  // full-width first · link columns in a 2-col grid · divider · legal bar
  // with © first and the utilities as one grouped wrapping cluster.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();

  const brand = footer.getByText("Financial intelligence for modern growth.");
  const firstColumn = footer.getByRole("navigation", { name: "Product" });
  const brandBox = (await brand.boundingBox())!;
  const columnBox = (await firstColumn.boundingBox())!;
  expect(brandBox.y).toBeLessThan(columnBox.y);

  // The 4 canonical columns render as an orderly 2-col grid below md.
  const gridTracks = await firstColumn.evaluate(
    (nav) =>
      getComputedStyle(nav.parentElement!).gridTemplateColumns.split(" ")
        .length,
  );
  expect(gridTracks).toBe(2);

  // Legal bar: © first; the utilities (security CTA · language) follow
  // as one grouped cluster on their own wrapped row.
  const legal = footer.getByText(/© Cuesoft Inc\. 2026\. Expendit\./);
  const security = footer.getByRole("link", { name: "View Security Policy" });
  const language = footer.getByRole("combobox", { name: "Language" });
  const legalBox = (await legal.boundingBox())!;
  const securityBox = (await security.boundingBox())!;
  const languageBox = (await language.boundingBox())!;
  expect(legalBox.y).toBeLessThan(securityBox.y);
  // Security CTA and language selector share the cluster row.
  expect(
    Math.abs(
      securityBox.y +
        securityBox.height / 2 -
        (languageBox.y + languageBox.height / 2),
    ),
  ).toBeLessThan(securityBox.height);
});

test("mobile (390w): the hamburger panel reaches every canonical nav destination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Marketing" }).first();

  // Canon (revised 2026-07-19): below md the bar keeps the Try Cloud
  // primary CTA visible BESIDE the hamburger — before the panel opens.
  const barTryCloud = nav
    .getByRole("link", { name: "Try Cloud" })
    .filter({ visible: true });
  await expect(barTryCloud).toHaveCount(1);
  await expect(barTryCloud).toHaveAttribute("href", "/signin");

  // Text links are collapsed, not lost: the disclosure carries them.
  const menu = nav.getByRole("button", { name: "Menu" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");

  // The desktop link set stays in the DOM (hidden below md) — scope the
  // assertions to what is actually visible: the panel copies.
  for (const [label, href] of NAV_LINKS) {
    const link = nav
      .getByRole("link", { name: label })
      .filter({ visible: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(
    nav.getByRole("link", { name: "Sign in" }).filter({ visible: true }),
  ).toHaveAttribute("href", "/signin");
  // The panel adds NO duplicate Try Cloud — the bar CTA remains the one
  // visible instance (canon revision 2026-07-19).
  await expect(
    nav.getByRole("link", { name: "Try Cloud" }).filter({ visible: true }),
  ).toHaveCount(1);

  // The panel's GitHub item is the SAME star badge as desktop (glyph +
  // neutral "Star" in TEST_MODE — never a plain text link).
  const panelStar = nav
    .getByRole("link", { name: STAR_NAME })
    .filter({ visible: true });
  await expect(panelStar).toHaveText("Star");
  await expect(panelStar.locator("svg")).toBeVisible();

  // Theme toggle works from the panel (fresh boot is dark, the design
  // default; dark → system → light → dark).
  await nav
    .getByRole("button", { name: "Theme: dark — switch to system" })
    .filter({ visible: true })
    .click();
  await nav
    .getByRole("button", { name: "Theme: system — switch to light" })
    .filter({ visible: true })
    .click();
  await nav
    .getByRole("button", { name: "Theme: light — switch to dark" })
    .filter({ visible: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.getAttribute("data-theme")),
    )
    .toBe("dark");

  // In-page anchors navigate (menu closes, section scrolls into view).
  await nav
    .getByRole("link", { name: "Pricing" })
    .filter({ visible: true })
    .click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#compare")).toBeInViewport();
});

const expectTheme = async (page: Page, theme: string | null) => {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.getAttribute("data-theme")),
    )
    .toBe(theme);
};

test("theme toggle cycles light → dark → system and persists on the home page", async ({
  page,
}) => {
  // Deterministic OS scheme for the system-resolution assertions.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  // Fresh visit = the dark design default (key absent — theme contract).
  await expectTheme(page, "dark");
  expect(
    await page.evaluate(() => localStorage.getItem("expendit.theme")),
  ).toBeNull();

  // dark(default) → system. The initial attr is applied pre-hydration
  // (init script), so retry the click until React's handler is attached —
  // detected via storage (the attribute stays dark under the dark OS).
  const toggle = page.getByTestId("theme-toggle");
  await expect(async () => {
    await toggle.click();
    expect(
      await page.evaluate(() => localStorage.getItem("expendit.theme")),
    ).toBe("system");
  }).toPass({ timeout: 15_000 });
  await expectTheme(page, "dark"); // OS is dark

  // system → light (explicit choice).
  await toggle.click();
  await expectTheme(page, "light");
  expect(
    await page.evaluate(() => localStorage.getItem("expendit.theme")),
  ).toBe("light");

  // Pre-paint persistence across a reload (no FOUC path).
  await page.reload();
  await expectTheme(page, "light");

  // light → dark (explicit choice ignores the OS).
  await expect(async () => {
    await toggle.click();
    await expectTheme(page, "dark");
  }).toPass({ timeout: 15_000 });
  expect(
    await page.evaluate(() => localStorage.getItem("expendit.theme")),
  ).toBe("dark");

  // dark → system: stored explicitly (key absent = the dark design
  // default); resolved follows the OS and tracks a live flip without a
  // reload.
  await toggle.click();
  expect(
    await page.evaluate(() => localStorage.getItem("expendit.theme")),
  ).toBe("system");
  await expectTheme(page, "dark"); // OS is dark
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "dark");
});

test("theme toggle lives in the dashboard chrome and persists", async ({
  page,
}) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard");
  await expect(
    page.getByRole("heading", { name: "Overview", level: 1 }),
  ).toBeVisible();

  // Fresh session = dark (the design default, key absent).
  await expectTheme(page, "dark");
  await page
    .getByRole("button", { name: "Theme: dark — switch to system" })
    .click();
  await page
    .getByRole("button", { name: "Theme: system — switch to light" })
    .click();
  await expectTheme(page, "light");
  expect(
    await page.evaluate(() => localStorage.getItem("expendit.theme")),
  ).toBe("light");

  await page.reload();
  await expectTheme(page, "light");

  // The B9 settings control reads the same store (one source of truth) —
  // its three-way segmented control moves the preference to system,
  // stored explicitly (not key-absent). Appearance rides the tail of the
  // Organization tab (routed tabs, user-ratified 2026-07-20).
  await page.goto("/dashboard/settings/organization");
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await page
    .getByRole("radiogroup", { name: "Theme" })
    .getByRole("radio", { name: "System" })
    .click();
  await expectTheme(page, "light");
  expect(
    await page.evaluate(() => localStorage.getItem("expendit.theme")),
  ).toBe("system");
});
