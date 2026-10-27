import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Nest injects by constructor parameter types; the classes are used.
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
);
