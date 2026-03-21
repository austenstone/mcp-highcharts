import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import fs from "node:fs";

const INPUT = process.env.INPUT;
if (!INPUT) {
  throw new Error("INPUT environment variable is not set");
}

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * All Highcharts packages use es-modules/ (granular ESM) — the same structure
 * Highcharts uses internally in their monorepo. This gives us:
 * - Shared Core/ files between highcharts and @highcharts/dashboards
 * - True tree-shaking at the individual module level
 * - Consistent import resolution matching Highcharts' own build
 *
 * @see https://www.highcharts.com/docs/getting-started/installation-with-esm
 * @see https://www.highcharts.com/docs/dashboards/installation-with-es-modules
 */

// Resolve paths relative to node_modules
const resolve = (...segments: string[]) => path.resolve("node_modules", ...segments);

// Highcharts granular ESM (es-modules/masters/)
const hcMaster = (p: string) => resolve("highcharts/es-modules/masters", p);

// Auto-generate aliases for every module and theme in es-modules/masters/
function buildMasterAliases(subdir: string, prefix: string): Record<string, string> {
  const dir = path.resolve("node_modules/highcharts/es-modules/masters", subdir);
  return fs.readdirSync(dir)
    .filter((f: string) => f.endsWith(".src.js"))
    .reduce((acc: Record<string, string>, f: string) => {
      acc[`${prefix}/${f.replace(".src.js", "")}`] = path.join(dir, f);
      return acc;
    }, {});
}

export default defineConfig({
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      // --- Highcharts Core (es-modules/masters/) ---
      "highcharts/highcharts-more": hcMaster("highcharts-more.src.js"),
      "highcharts/highcharts-3d": hcMaster("highcharts-3d.src.js"),
      ...buildMasterAliases("modules", "highcharts/modules"),
      ...buildMasterAliases("themes", "highcharts/themes"),
      highcharts: hcMaster("highcharts.src.js"),

      // --- Dashboards (es-modules/masters/) ---
      "@highcharts/dashboards/css/dashboards.css": resolve("@highcharts/dashboards/css/dashboards.css"),
      "@highcharts/dashboards/modules/layout": resolve("@highcharts/dashboards/es-modules/masters/modules/layout.src.js"),
      "@highcharts/dashboards": resolve("@highcharts/dashboards/es-modules/masters/dashboards.src.js"),

      // --- Grid Lite (es-modules/masters/) ---
      "@highcharts/grid-lite/css/grid-lite.css": resolve("@highcharts/grid-lite/css/grid-lite.css"),
      "@highcharts/grid-lite": resolve("@highcharts/grid-lite/es-modules/masters/grid-lite.src.js"),
    },
  },
  build: {
    sourcemap: isDevelopment ? "inline" : undefined,
    cssMinify: !isDevelopment,
    minify: !isDevelopment,
    rollupOptions: { input: INPUT },
    outDir: "dist",
    emptyOutDir: false,
  },
});
