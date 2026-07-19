import { defineConfig } from "vitest/config";

/**
 * Vitest — the single unit/integration runner (components, controllers,
 * mock handlers); tests co-locate under src/**. src/legacy is excluded
 * per the quarantine policy.
 *
 * Environments: jsdom by default (components); the mock-server suites pin
 * `@vitest-environment node` per file so Request/FormData/File stay the
 * undici implementations end to end.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/legacy/**", "node_modules/**"],
    setupFiles: ["src/vitest.setup.ts"],
    env: {
      NEXT_PUBLIC_TEST_MODE: "1",
    },
  },
});
