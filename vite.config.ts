import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import fs from "node:fs";
import { highchartsModulesPlugin } from "./vite-plugin-highcharts-modules";

const INPUT = process.env.INPUT;
if (!INPUT) {
  throw new Error("INPUT environment variable is not set");
}

const isDevelopment = process.env.NODE_ENV === "development";

// Use Highcharts packed ESM bundles (v12.2+) which handle init order correctly
const hcEsm = (p: string) =>
  path.resolve("node_modules/highcharts/esm", p);

// Auto-generate aliases for every Highcharts module
const hcModules = fs.readdirSync(path.resolve("node_modules/highcharts/esm/modules"))
  .filter((f: string) => f.endsWith(".src.js"))
  .reduce((acc: Record<string, string>, f: string) => {
    const name = f.replace(".src.js", "");
    acc[`highcharts/modules/${name}`] = hcEsm(`modules/${f}`);
    return acc;
  }, {} as Record<string, string>);

// Auto-generate aliases for every Highcharts theme
const hcThemes = fs.readdirSync(path.resolve("node_modules/highcharts/esm/themes"))
  .filter((f: string) => f.endsWith(".src.js"))
  .reduce((acc: Record<string, string>, f: string) => {
    const name = f.replace(".src.js", "");
    acc[`highcharts/themes/${name}`] = hcEsm(`themes/${f}`);
    return acc;
  }, {} as Record<string, string>);

export default defineConfig({
  plugins: [react(), viteSingleFile(), highchartsModulesPlugin()],
  resolve: {
    alias: {
      "highcharts/highcharts-more": hcEsm("highcharts-more.src.js"),
      "highcharts/highcharts-3d": hcEsm("highcharts-3d.src.js"),
      ...hcModules,
      ...hcThemes,
      highcharts: hcEsm("highcharts.src.js"),
    },
  },
  legacy: {
    // highcharts-react-official is CJS with __esModule — Vite 8 changed default interop
    inconsistentCjsInterop: true,
  },
  build: {
    sourcemap: isDevelopment ? "inline" : undefined,
    cssMinify: !isDevelopment,
    minify: !isDevelopment,
    rollupOptions: {
      input: INPUT,
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
