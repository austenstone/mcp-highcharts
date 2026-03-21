import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import fs from "node:fs";
const INPUT = process.env.INPUT;
if (!INPUT) {
  throw new Error("INPUT environment variable is not set");
}

const isDevelopment = process.env.NODE_ENV === "development";

// Use Highcharts packed ESM bundles (v12.2+) which handle init order correctly
const hcEsm = (p: string) =>
  path.resolve("node_modules/highcharts/esm", p);

// Auto-generate aliases for every Highcharts module and theme
function buildAliases(subdir: string, prefix: string): Record<string, string> {
  return fs.readdirSync(path.resolve("node_modules/highcharts/esm", subdir))
    .filter((f: string) => f.endsWith(".src.js"))
    .reduce((acc: Record<string, string>, f: string) => {
      acc[`${prefix}/${f.replace(".src.js", "")}`] = hcEsm(`${subdir}/${f}`);
      return acc;
    }, {});
}

export default defineConfig({
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      "highcharts/highcharts-more": hcEsm("highcharts-more.src.js"),
      "highcharts/highcharts-3d": hcEsm("highcharts-3d.src.js"),
      ...buildAliases("modules", "highcharts/modules"),
      ...buildAliases("themes", "highcharts/themes"),
      highcharts: hcEsm("highcharts.src.js"),
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
