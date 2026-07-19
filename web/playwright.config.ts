import { defineConfig, devices } from "@playwright/test";

/**
 * E2E harness — runs in TEST_MODE against the in-app mock server (org web
 * standard: Playwright journeys mirror design.md §8.4, TEST_MODE only).
 *
 * PW_PORT overrides the server port; each repo reserves its own default
 * lane so parallel local runs across sibling repos never collide. CI builds
 * first and runs against `next start`; local runs use the dev server.
 */
const PORT = Number(process.env.PW_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI
      ? `npm run start -- -p ${PORT} --hostname 127.0.0.1`
      : `npm run dev -- -p ${PORT} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/signin`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_TEST_MODE: "1",
    },
  },
});
