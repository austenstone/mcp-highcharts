import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import highchartsPlugin from "@highcharts/eslint-plugin-highcharts";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      highcharts: highchartsPlugin,
    },
    rules: {
      // Highcharts rules
      "highcharts/no-highcharts-object": "error",

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
    ignores: ["dist/", "node_modules/", "scripts/", "tests/", "test-runner.js", "test.html"],
  },
);
