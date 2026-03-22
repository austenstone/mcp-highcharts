import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import highchartsPlugin from "@highcharts/eslint-plugin-highcharts";
import zodPlugin from "eslint-plugin-zod";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      highcharts: highchartsPlugin,
      zod: zodPlugin,
    },
    rules: {
      // Highcharts rules
      "highcharts/no-highcharts-object": "error",

      // Zod rules (recommended)
      "zod/consistent-import": "error",
      "zod/no-any-schema": "off", // generated schemas use z.any() for complex Highcharts types
      "zod/no-empty-custom-schema": "error",
      "zod/prefer-meta": "off", // MCP SDK needs .describe() for JSON Schema output

      // TypeScript adjustments
      "@typescript-eslint/no-explicit-any": "off", // dynamic Highcharts options need any
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
  },
  {
    ignores: ["dist/", "node_modules/", "scripts/", "tests/", "src/generated/", "test-runner.js", "test.html"],
  },
);
