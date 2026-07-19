import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Quarantined legacy trees: excluded from build & lint until their
    // retirement PRs land (web standard — legacy/dead-code policy).
    "src/legacy/**",
    // Playwright output
    "playwright-report/**",
    "test-results/**",
  ]),
  // Boundary gates (web standard §8 + MVC, W3): live code never imports
  // MUI or the quarantined src/legacy/ trees. The check:boundaries script
  // adds the grep-level gates (raw hex, fetch outside the client).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/legacy/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mui/*"],
              message:
                "MUI is legal only under src/legacy/ (web-implementation.md §8); new code builds from the token layer.",
            },
            {
              group: ["@/legacy/*", "**/legacy/*"],
              message:
                "Quarantined legacy trees are dead code pending retirement PRs — do not import them.",
            },
          ],
        },
      ],
    },
  },
  // CommonJS config files legitimately use require().
  {
    files: ["jest.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
