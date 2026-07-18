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
  // Pre-redesign live trees (MUI-era, replaced at W2/W3 then quarantined):
  // long-standing `any`s and effect patterns are debt scheduled for
  // retirement, not for churn now — downgraded to warnings so new-system
  // code stays strictly gated while the legacy surface remains visible.
  {
    files: [
      "src/api/**",
      "src/components/**",
      "src/context/**",
      "src/hooks/**",
      "src/utils/**",
      "src/dummy/**",
      "src/global.d.ts",
    ],
    ignores: ["src/components/ui/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
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
