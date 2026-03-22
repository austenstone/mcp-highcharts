import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import nodePlugin from "eslint-plugin-n";
import highchartsPlugin from "@highcharts/eslint-plugin-highcharts";
import zodPlugin from "eslint-plugin-zod";

export default tseslint.config(
  // ── Base ──
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Node.js ──
  nodePlugin.configs["flat/recommended-module"],

  // ── Project rules ──
  {
    plugins: {
      highcharts: highchartsPlugin,
      zod: zodPlugin,
    },
    rules: {
      // Highcharts rules
      "highcharts/no-highcharts-object": "error",

      // Zod rules
      "zod/consistent-import": "error",
      "zod/no-any-schema": "off", // generated schemas use z.any() for complex Highcharts types
      "zod/no-empty-custom-schema": "error",
      "zod/prefer-meta": "off", // MCP SDK needs .describe() for JSON Schema output

      // TypeScript
      "@typescript-eslint/no-explicit-any": "off", // dynamic Highcharts options need any
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],

      // Node.js — disable rules that conflict with TypeScript/bundler resolution
      "n/no-missing-import": "off", // TypeScript handles this
      "n/no-unpublished-import": "off", // devDependencies are fine in source
      "n/no-unsupported-features/node-builtins": "off", // we target Node 18+
      "n/no-process-exit": "off", // CLI entry point uses process.exit
      "n/hashbang": "off", // shebang is stripped by tsc in dist/
    },
  },

  // ── Ignores ──
  {
    ignores: ["dist/", "node_modules/", "scripts/", "src/generated/", "test-runner.js", "test.html"],
  },
);
