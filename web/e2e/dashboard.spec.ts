import { expect, test, type Page } from "@playwright/test";

/**
 * W3 dashboard journeys (design.md §8.4 "Core journey — sign in",
 * web-implementation.md §7): signin → overview → transactions CRUD →
 * import journey → statements mapping → ratios → tax wizard → filing
 * history, plus the keyboard-first path (⌘K palette MI-1 + table nav
 * ↑↓/enter/`e`, design.md §5) and the legacy-route redirects (§8 step 2).
 *
 * Runs in TEST_MODE against the in-app mock server; the journey mutates
 * the shared seeded store, so the file runs serially and steps stay
 * tolerant of re-runs (duplicates re-flagged, statements already
 * confirmed on retry).
 */

test.describe.configure({ mode: "serial" });

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
};

const switchToCompanyOrg = async (page: Page): Promise<void> => {
  // OrgSwitcher: personal is the seeded default context (api.md §5).
  const trigger = page.getByRole("button", { name: /Personal|Cuesoft/ });
  await trigger.first().click();
  await page
    .getByRole("listbox", { name: "Organizations" })
    .getByRole("option", { name: /Cuesoft Ltd/ })
    .click();
};

const openNav = (page: Page, label: string) =>
  // Badge counts (MI-5) join the accessible name — match on the prefix.
  page.getByRole("navigation", { name: "Primary" }).getByRole("link", {
    name: new RegExp(`^${label}`),
  });

test("core journey — overview, ledger CRUD, import, statements, ratios, tax wizard, filing history", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);

  // --- B1 overview renders the seeded narrative -------------------------
  await expect(
    page.getByRole("heading", { name: "Overview", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Net cash flow").first()).toBeVisible();
  await switchToCompanyOrg(page);
  await expect(page.getByText("Net cash flow").first()).toBeVisible();

  // --- B2 transactions CRUD (manual path, MI-11 inspector) --------------
  await openNav(page, "Transactions").click();
  await page.waitForURL("**/dashboard/transactions");
  await expect(page.locator("table tbody tr").first()).toBeVisible();

  // Create
  await page.getByRole("button", { name: "New transaction" }).click();
  const newDialog = page.getByRole("dialog", { name: "New transaction" });
  await expect(newDialog).toBeVisible();
  await newDialog.getByLabel("Description").fill("E2E espresso");
  await newDialog.getByLabel("Amount").fill("4200");
  await newDialog.getByRole("combobox").click();
  await page.getByRole("option").first().click();
  await newDialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(page.getByText("Transaction added")).toBeVisible();
  const createdRow = page.locator("tr", { hasText: "E2E espresso" }).first();
  await expect(createdRow).toBeVisible();

  // Update (double-click opens the record inspector)
  await createdRow.dblclick();
  const editDialog = page.getByRole("dialog", { name: "Transaction" });
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel("Amount").fill("5300");
  await editDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Transaction updated")).toBeVisible();
  await expect(
    page.locator("tr", { hasText: "E2E espresso" }).first(),
  ).toContainText("5,300");

  // Delete
  await page.locator("tr", { hasText: "E2E espresso" }).first().dblclick();
  await page
    .getByRole("dialog", { name: "Transaction" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Transaction deleted")).toBeVisible();
  await expect(page.locator("tr", { hasText: "E2E espresso" })).toHaveCount(0);

  // --- B3 import journey: upload → 202 job → staged review → commit -----
  await openNav(page, "Imports").click();
  await page.waitForURL("**/dashboard/imports");
  const csv = [
    "date,description,amount,direction",
    "2026-07-02,POS — Shoprite Lekki,12000,expense",
    "2026-07-03,Transfer — client payment,250000,income",
  ].join("\n");
  await page.getByLabel("Upload files").setInputFiles({
    name: "gtb-june-e2e.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  // MI-2 lifecycle lands on ✓ row count once the job completes.
  const jobRow = page
    .getByRole("button")
    .filter({ hasText: "gtb-june-e2e.csv" })
    .first();
  await expect(jobRow).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () => jobRow.getAttribute("data-status"), {
      timeout: 20_000,
    })
    .toMatch(/completed/);
  await jobRow.click();
  await page.waitForURL("**/dashboard/imports/**");

  // Staged review (B3b): counts + MI-3 commit.
  await expect(page.getByText(/transactions staged/)).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: /^Import \d+/ }).click();
  await page.waitForURL(/\/dashboard\/transactions\?imported=\d+/);

  // --- B6 statements: mapping review → confirm → statement view ---------
  await openNav(page, "Statements").click();
  await page.waitForURL("**/dashboard/company");
  await page
    .getByRole("button", { name: /Balance sheet · 2026-Q2/ })
    .first()
    .click();
  await page.waitForURL("**/dashboard/company/statements/**");
  // Wait for the drill-in to leave its loading skeleton (review heading
  // "Review mapping — …" or the confirmed statement heading) before
  // branching on the review state.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Balance sheet · 2026-Q2/,
    { timeout: 15_000 },
  );

  const confirmMapping = page.getByRole("button", { name: "Confirm mapping" });
  if (await confirmMapping.isVisible().catch(() => false)) {
    // Map the low-confidence row (arrived unmapped, never guessed).
    await page
      .locator("li", { hasText: "Sundry balances" })
      .getByRole("combobox")
      .click();
    await page
      .getByRole("option", { name: "current_assets_other", exact: true })
      .click();

    // Add the parser-missed equity row so the identity check balances:
    // assets 23.94m = payables 5.1m + retained_earnings 18.84m.
    await page.getByRole("button", { name: "Add row" }).click();
    const addSection = page.getByRole("region", { name: "Add missing rows" });
    await addSection.getByRole("combobox").click();
    await page
      .getByRole("option", { name: "retained_earnings", exact: true })
      .click();
    await addSection.getByLabel("Amount").fill("18840000");
    await page.getByRole("button", { name: "Stage added rows" }).click();
    await expect(page.getByText(/row added|rows added/i)).toBeVisible();

    await confirmMapping.click();
    await expect(
      page.getByText(/Statement confirmed — ratios recomputed/),
    ).toBeVisible({ timeout: 15_000 });
  }
  // Statement view (normalized rows incl. derived totals — the registry
  // StatementView renders mono canonical keys, design.md §8.2).
  await expect(page.getByText("total_assets").first()).toBeVisible();

  // --- B6b ratios: gauges + MI-8 trace inspector -------------------------
  await openNav(page, "Ratios").click();
  await page.waitForURL("**/dashboard/company/ratios");
  await expect(page.getByText("Current ratio").first()).toBeVisible({
    timeout: 15_000,
  });
  await page
    .getByRole("button", { name: /Current ratio — how we got this/ })
    .click();
  const trace = page.getByRole("dialog", { name: /Current ratio/ });
  await expect(trace).toBeVisible();
  await expect(trace).toContainText(/current_assets/);
  await page.keyboard.press("Escape");

  // --- B7 tax center → B7b filing wizard → filing history ----------------
  await openNav(page, "Tax center").click();
  await page.waitForURL("**/dashboard/taxes");
  await expect(page.getByText(/Remit to/).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Start a filing" }).click();
  await page.waitForURL("**/dashboard/taxes/file");

  // Step 1 — period (VAT · 2026-06 is the seeded complete period).
  await page.getByRole("button", { name: "Draft filing" }).click();

  // Step 2 — data review: traceable computed fields (MI-10).
  await expect(page.getByText("Output VAT").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Looks right — continue" }).click();

  // Step 3 — documents: the remittance sheet names the authority.
  await expect(page.getByText("Remittance sheet (preview)")).toBeVisible();
  await expect(
    page.getByText("Federal Inland Revenue Service (FIRS)"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to submit" }).click();

  // Step 4 — typed confirmation of the period arms the final CTA.
  const generateCta = page.getByRole("button", {
    name: "Generate filing documents",
  });
  await expect(generateCta).toBeDisabled();
  await page.getByLabel("Confirm period").fill("2026-06");
  await expect(generateCta).toBeEnabled();
  await generateCta.click();

  // Stamped success + immutable history record.
  await expect(page.getByText(/VAT 2026-06 is filing-ready/)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Filing history" }).click();
  await page.waitForURL("**/dashboard/taxes");
  await expect(
    page
      .locator("li", { hasText: /vat/i })
      .filter({ hasText: "2026-06" })
      .first(),
  ).toBeVisible();
});

test("keyboard-first path — ⌘K palette and ledger table nav", async ({
  page,
}) => {
  await signIn(page);
  // Wait for the shell to hydrate (nav rendered) before global keys fire.
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Overview", level: 1 }),
  ).toBeVisible();

  // MI-1: ⌘K opens the palette; fuzzy match + enter runs the action.
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(palette).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await palette.getByRole("combobox").fill("upload stat");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard/imports?upload=1");

  // Palette navigation entry → transactions.
  await page.keyboard.press("ControlOrMeta+k");
  await palette.getByRole("combobox").fill("transactions");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard/transactions");

  // Table keyboard nav (design.md §5): ↑↓ rows, enter opens, `e` edits.
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  await rows.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(rows.first()).toBeFocused();

  await page.keyboard.press("Enter");
  const inspector = page.getByRole("dialog", { name: "Transaction" });
  await expect(inspector).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(inspector).toHaveCount(0);

  await rows.first().focus();
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog", { name: "Transaction" })).toBeVisible();
});

test("legacy flat routes redirect to their nested replacements", async ({
  page,
}) => {
  await signIn(page);
  const redirects: Array<[string, string]> = [
    ["/expense", "/dashboard/transactions"],
    ["/income", "/dashboard/transactions"],
    ["/history", "/dashboard/transactions"],
    ["/import", "/dashboard/imports"],
    ["/reports", "/dashboard/reports"],
    ["/categories", "/dashboard/categories"],
    ["/settings", "/dashboard/settings"],
  ];
  for (const [from, to] of redirects) {
    await page.goto(from);
    await page.waitForURL(`**${to}`);
    expect(page.url()).toContain(to);
  }
});

test("semantic chrome — one main landmark, labeled nav, real ledger table", async ({
  page,
}) => {
  await signIn(page);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

  await openNav(page, "Transactions").click();
  await page.waitForURL("**/dashboard/transactions");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("table").first()).toBeVisible();
  expect(await page.getByRole("columnheader").count()).toBeGreaterThan(2);
});
