import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"] ,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: globals.node,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
];
