import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import fs from "node:fs";

// Use Highcharts packed ESM bundles (v12.2+) which handle init order correctly
const hcEsm = (p: string) =>
  path.resolve("node_modules/highcharts/esm", p);

function buildAliases(subdir: string, prefix: string): Record<string, string> {
  return fs.readdirSync(path.resolve("node_modules/highcharts/esm", subdir))
    .filter((f: string) => f.endsWith(".src.js"))
    .reduce((acc: Record<string, string>, f: string) => {
      acc[`${prefix}/${f.replace(".src.js", "")}`] = hcEsm(`${subdir}/${f}`);
      return acc;
    }, {});
}

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "highcharts/highcharts-more": hcEsm("highcharts-more.src.js"),
      "highcharts/highcharts-3d": hcEsm("highcharts-3d.src.js"),
      ...buildAliases("modules", "highcharts/modules"),
      ...buildAliases("themes", "highcharts/themes"),
      highcharts: hcEsm("highcharts.src.js"),
    },
  },
  test: {
    include: ["tests/visual/**/*.test.ts"],
    testTimeout: 15_000,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: false,
    },
  },
});
