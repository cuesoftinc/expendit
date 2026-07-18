import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e — TEST_MODE journeys against the in-app mock server
 * (design.md §8.4 prototype journeys; W0 ships the signin → dashboard
 * smoke). CI builds first, then runs against `next start`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI
      ? "npm run start -- -p 3100"
      : "npm run dev -- -p 3100",
    port: 3100,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_TEST_MODE: "1",
    },
    timeout: 120_000,
  },
});
