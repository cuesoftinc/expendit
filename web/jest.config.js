const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/src/setup-tests.ts"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testEnvironment: "jest-environment-jsdom",
  // Jest owns the legacy suite in __tests__/; Vitest owns src/** — the two
  // runners coexist (web standard) and must not pick up each other's tests.
  testMatch: ["<rootDir>/__tests__/**/*.test.{ts,tsx}"],
  // Keep the build output out of haste-map (name collision with package.json).
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
