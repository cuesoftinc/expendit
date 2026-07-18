import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e — TEST_MODE journeys against the in-app mock server
 * (design.md §8.4 prototype journeys; W0 ships the signin → dashboard
 * smoke). CI builds first, then runs against `next start`.
 *
 * PW_PORT overrides the dev-server port (default 3100) so local runs can
 * dodge port collisions with sibling projects; CI stays on the default.
 */
const PORT = process.env.PW_PORT ?? "3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI
      ? `npm run start -- -p ${PORT}`
      : `npm run dev -- -p ${PORT}`,
    port: Number(PORT),
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_TEST_MODE: "1",
    },
    timeout: 120_000,
  },
});
