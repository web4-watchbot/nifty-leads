import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "*.config.ts", "vitest.config.ts"],
  }
);
