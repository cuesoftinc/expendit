import { expect, test, type Page } from "@playwright/test";

/**
 * W3 dashboard journeys (design.md §8.4 "Core journey — sign in",
 * web-implementation.md §7): signin → overview → transactions CRUD →
 * import journey → statements mapping → ratios → tax wizard → filing
 * history, plus the keyboard-first path (⌘K palette MI-1 + table nav
 * ↑↓/enter/`e`, design.md §5) and the legacy flat-path 404s
 * (web-implementation.md §4/§8: no redirect stubs, branded 404 page).
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
  // Personal cash-flow series: a full trailing year of real monthly
  // points — never a fabricated flat segment over pre-ledger months.
  await expect(page.getByText("Cash flow — 12 months")).toBeVisible();
  const personalPoints = await page
    .getByTestId("chart-line-net")
    .getAttribute("points");
  expect(personalPoints?.trim().split(/\s+/).length).toBeGreaterThanOrEqual(12);
  // Y-axis construction (Figma Chart/Line master): ₦-compact nice ticks
  // left of the plot + a gridline each; the personal domain dips negative.
  const personalYAxis = page.getByTestId("chart-y-axis");
  await expect(personalYAxis.getByText("₦0", { exact: true })).toBeVisible();
  await expect(personalYAxis.getByText("−₦1M", { exact: true })).toBeVisible();
  await expect(personalYAxis.getByText("₦2M", { exact: true })).toBeVisible();
  // B1 mid-band (Figma 179:12): chart card + right rail render as TWO
  // columns at lg — locks the `lg:grid-cols-[2fr_1fr]` arbitrary value
  // (the comma form is invalid CSS and silently stacked the band).
  const chartCard = page.locator("section", {
    has: page.getByRole("heading", { name: /^Cash flow — / }),
  });
  const donutCard = page.locator("section", {
    has: page.getByRole("heading", { name: /^Expenses by category/ }),
  });
  const chartBox = await chartCard.boundingBox();
  const donutBox = await donutCard.boundingBox();
  expect(chartBox).not.toBeNull();
  expect(donutBox).not.toBeNull();
  expect(donutBox!.x).toBeGreaterThanOrEqual(chartBox!.x + chartBox!.width);
  expect(Math.abs(donutBox!.y - chartBox!.y)).toBeLessThan(8);
  // Single-series charts carry no legend row (Figma B1 — the legend only
  // renders when there is more than one series to disambiguate).
  await expect(chartCard.locator("figcaption")).toHaveCount(0);

  await switchToCompanyOrg(page);
  await expect(page.getByText("Net cash flow").first()).toBeVisible();
  // Company ledger onset is Jan 2026 — the chart starts there and says so.
  await expect(page.getByText("Cash flow — since Jan 2026")).toBeVisible();
  const companyPoints = await page
    .getByTestId("chart-line-net")
    .getAttribute("points");
  expect(companyPoints?.trim().split(/\s+/).length).toBe(7);
  const companyYAxis = page.getByTestId("chart-y-axis");
  await expect(companyYAxis.getByText("−₦2.5M", { exact: true })).toBeVisible();
  await expect(companyYAxis.getByText("₦5M", { exact: true })).toBeVisible();

  // --- Anomaly explain (Figma 208:3967 + master 67:349) ------------------
  // "Explain in ledger" deep-links INTO the explain panel over the
  // filtered ledger; the panel carries humanized severity, the rule
  // provenance line, the comparables median footer, and Mark expected.
  await page.getByRole("link", { name: "Explain in ledger →" }).click();
  await page.waitForURL(/anomalies=1.*record=.*explain=1/);
  const explain = page.getByRole("dialog", { name: "Why this was flagged" });
  await expect(explain).toBeVisible();
  await expect(explain.getByText(/^(High|Low)$/)).toBeVisible();
  await expect(explain.getByText(/rule: [a-z_]+ v\d+/)).toBeVisible();
  await expect(explain.getByText(/Median of \d+ comparable/)).toBeVisible();
  // Mark expected flips the flag in the mock — the entry stops flagging.
  await explain.getByRole("button", { name: "Mark expected" }).click();
  await expect(
    page.getByText("Marked expected — this entry is no longer flagged."),
  ).toBeVisible();

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
  // B3 (Figma 183:855): header "Upload statement" primary + the
  // "Import history" heading.
  await expect(
    page.getByRole("button", { name: "Upload statement" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Import history" }),
  ).toBeVisible();
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
    // Parse-complete jobs park in staged review as "needs-review"
    // (system QA 2026-07-19 — the green Completed tag hid the parked
    // review); bank/auto-confirmed jobs stay "completed*".
    .toMatch(/completed|needs-review/);
  // Relative ages (systemic adjudication): history rows say "…ago".
  await expect(jobRow.getByText(/just now|\d+m ago/)).toBeVisible();
  // Post-parse summary card beside the dropzone (Figma B3): green check,
  // counts, and the "Review import" hand-off.
  const summaryCard = page.getByRole("region", {
    name: "Parsed statement summary",
  });
  await expect(summaryCard).toBeVisible();
  await expect(summaryCard.getByText(/transactions? found/)).toBeVisible();
  await expect(
    summaryCard.getByRole("button", { name: "Review import" }),
  ).toBeVisible();
  await jobRow.click();
  await page.waitForURL("**/dashboard/imports/**");

  // Staged review (B3b): counts + reassurance footer + MI-3 commit.
  await expect(page.getByText(/transactions staged/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/rows? will join your ledger/)).toBeVisible();
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
  // Statement view (Figma 98:743): human line labels with the canonical
  // key secondary in mono, bold derived rows with the ƒ chip, and the
  // green identity-check footer once the sheet balances.
  await expect(page.getByText("Total assets").first()).toBeVisible();
  await expect(page.getByText("total_assets").first()).toBeVisible();
  await expect(page.getByText("ƒ derived").first()).toBeVisible();
  await expect(page.getByText("Assets = Liabilities + Equity")).toBeVisible();
  // Export lives in the statement card header, not the page header.
  await expect(
    page
      .locator("section[data-kind] header")
      .getByRole("button", { name: "Export to report" }),
  ).toBeVisible();

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

  // Trends: discrete FY observations — point markers at each confirmed
  // fiscal year, FY ticks at the data positions (not a fake full-width
  // continuous trend from two datapoints).
  const trends = page.getByRole("region", { name: "Trends" });
  await expect(trends.getByText("FY2024")).toBeVisible();
  await expect(trends.getByText("FY2025")).toBeVisible();
  for (const seriesId of ["revenue", "gross", "net"]) {
    await expect(
      trends.getByTestId(`chart-markers-${seriesId}`).locator("circle"),
    ).toHaveCount(2);
  }
  // The trend chart carries the same y-axis construction, ₦-compact:
  // revenue tops FY2025 turnover ₦128.4M → ticks ₦0 / ₦50M / ₦100M / ₦150M.
  await expect(
    trends.getByTestId("chart-y-axis").getByText("₦100M", { exact: true }),
  ).toBeVisible();
  await expect(
    trends.getByTestId("chart-y-axis").getByText("₦0", { exact: true }),
  ).toBeVisible();
  // Multi-series chart keeps its legend; the data-table toggle swaps the
  // chart for an accessible table (Figma B6b trend card).
  await expect(trends.locator("figcaption")).toContainText("Gross profit");
  await trends.getByRole("button", { name: "Data table" }).click();
  await expect(trends.getByRole("table", { name: "Trend data" })).toBeVisible();
  await expect(
    trends.getByRole("columnheader", { name: "Net income" }),
  ).toBeVisible();
  await trends.getByRole("button", { name: "Chart" }).click();
  await expect(trends.getByTestId("chart-y-axis")).toBeVisible();

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

  // Step 2 — data review (Figma B7b anatomy): H2 + frame line names,
  // FIRST trace accordion expanded, summary footnote, CTA to forms.
  await expect(page.getByText("Output VAT").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { name: "Data review" }),
  ).toBeVisible();
  await expect(
    page.getByText("Input VAT — paid on purchases").first(),
  ).toBeVisible();
  await expect(page.getByText("Net VAT payable").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Output VAT — collected on sales/ }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("Estimates update as you review line items."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to forms" }).click();

  // Step 3 — forms: the remittance sheet names the authority.
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

test("reports — inline toolbar, generating strip, artifact meta, expiry caption (B5)", async ({
  page,
}) => {
  await signIn(page);
  await switchToCompanyOrg(page);
  await openNav(page, "Reports").click();
  await page.waitForURL("**/dashboard/reports");

  // Inline toolbar (Figma B5): PDF·CSV segmented + "Generate report".
  await expect(page.getByRole("radiogroup", { name: "Format" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate report" }),
  ).toBeVisible();

  // Generating strip above the history with the % read-out.
  await expect(
    page.getByText(/Generating Cash movement — Jun 2026/),
  ).toBeVisible();
  await expect(page.getByText(/pdf · \d+%/i)).toBeVisible();

  // History: "Artifact history" heading, titled rows with size meta,
  // and the expiry reassurance caption.
  await expect(
    page.getByRole("heading", { name: "Artifact history" }),
  ).toBeVisible();
  await expect(page.getByText("Monthly summary — Jun 2026")).toBeVisible();
  await expect(page.getByText(/1\.2 MB/).first()).toBeVisible();
  await expect(
    page.getByText("Artifacts expire after 30 days. You can regenerate any report at any time."),
  ).toBeVisible();
});

test("bank-link journey — tile tray, consent deck, determinate sync, stamped done (MI-9)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await switchToCompanyOrg(page);
  await openNav(page, "Accounts").click();
  await page.waitForURL("**/dashboard/accounts");

  // Re-auth banner (Figma B4): amber warning + frame copy + CTA label.
  await expect(
    page.getByText(/link expired — sync paused since/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Re-authenticate" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Link account" }).click();
  const modal = page.getByRole("dialog", { name: "Link a bank account" });
  await expect(modal).toBeVisible();
  // Tile tray (Figma B4b): icon-circle steps with sub-captions.
  await expect(modal.getByText("Bank selected")).toBeVisible();
  await expect(modal.getByText("Mono consent screen")).toBeVisible();
  await expect(modal.getByText("Imports transactions")).toBeVisible();
  // Footer: right-aligned Cancel-then-primary (Modal canon).
  await modal.getByRole("button", { name: "Continue to Mono" }).click();

  // Consent step: per-step title + the frame's consent copy deck.
  const consent = page.getByRole("dialog", {
    name: "Approve access in your bank app",
  });
  await expect(
    consent.getByText(/credentials never touch Expendit/),
  ).toBeVisible();
  await consent.getByRole("button", { name: "Approve" }).click();

  // Syncing: determinate % + account label (Figma B4b).
  const syncing = page.getByRole("dialog", {
    name: "Importing your transactions…",
  });
  await expect(syncing.getByText("Syncing GTBank ···0482")).toBeVisible();
  await expect(syncing.getByText(/· \d+%/)).toBeVisible();

  // Done: StampedCheck + staged copy; footer primary "Review import".
  const done = page.getByRole("dialog", { name: "GTBank connected" });
  await expect(done).toBeVisible({ timeout: 20_000 });
  await expect(done.getByText(/transactions staged for review\./)).toBeVisible();
  await done.getByRole("button", { name: "Review import" }).click();
  await page.waitForURL("**/dashboard/imports/**");
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

test("legacy flat routes 404 on the branded page", async ({ page }) => {
  await signIn(page);
  const legacyPaths = [
    "/expense",
    "/income",
    "/history",
    "/import",
    "/reports",
    "/categories",
    "/settings",
  ];
  for (const path of legacyPaths) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "This page doesn’t add up." }),
    ).toBeVisible();
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
