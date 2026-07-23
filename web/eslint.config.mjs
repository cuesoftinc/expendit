import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import testingLibrary from "eslint-plugin-testing-library";

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
              group: ["@mui/*", "@emotion/*"],
              message:
                "Styled kits were pruned with the MUI retirement (web-implementation.md §8); build from the token layer.",
            },
            {
              group: ["dayjs", "moment"],
              message:
                "date-fns is the canonical date library (org SKILL) — use @/lib/dates helpers.",
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
  // Testing Library lint (org web standard): the flat/react preset, scoped
  // to the co-located unit/component tests.
  {
    files: ["src/**/*.test.{ts,tsx}"],
    ...testingLibrary.configs["flat/react"],
    rules: {
      ...testingLibrary.configs["flat/react"].rules,
      // The component-reuse policy (web-implementation.md) builds all visual
      // components bespoke from the token layer — their tests assert
      // non-semantic structure (SVG geometry, token classes) that has no
      // role/label to query, so container/node access is the intended
      // pattern, not a smell.
      "testing-library/no-container": "off",
      "testing-library/no-node-access": "off",
    },
  },
]);

export default eslintConfig;
