import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import fs from "node:fs";

// Highcharts UMD modules use global `_Highcharts` context which Vite 8's Rolldown
// bundler doesn't set up. Resolve to ESM builds instead.
const hcEsm = (p: string) =>
  path.resolve("node_modules/highcharts/es-modules/masters", p);

// Auto-generate aliases for every Highcharts module so we never have to add them 1-by-1
const hcModules = fs.readdirSync(path.resolve("node_modules/highcharts/es-modules/masters/modules"))
  .filter((f: string) => f.endsWith(".src.js"))
  .reduce((acc: Record<string, string>, f: string) => {
    const name = f.replace(".src.js", "");
    acc[`highcharts/modules/${name}`] = hcEsm(`modules/${f}`);
    return acc;
  }, {} as Record<string, string>);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "highcharts/highcharts-more": hcEsm("highcharts-more.src.js"),
      ...hcModules,
      highcharts: hcEsm("highcharts.src.js"),
    },
  },
  legacy: {
    // highcharts-react-official is CJS with __esModule — Vite 8 changed default interop
    inconsistentCjsInterop: true,
  },
  test: {
    include: ["tests/visual/**/*.test.tsx"],
    testTimeout: 15_000,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: false,
    },
  },
});
