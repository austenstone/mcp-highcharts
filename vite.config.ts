import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import fs from "node:fs";

const INPUT = process.env.INPUT;
if (!INPUT) {
  throw new Error("INPUT environment variable is not set");
}

const isDevelopment = process.env.NODE_ENV === "development";

// Highcharts UMD modules use global `_Highcharts` context which Vite 8's Rolldown
// bundler doesn't set up. Resolve to ESM builds instead.
const hcEsm = (p: string) =>
  path.resolve("node_modules/highcharts/es-modules/masters", p);

// Auto-generate aliases for every Highcharts module
const hcModules = fs.readdirSync(path.resolve("node_modules/highcharts/es-modules/masters/modules"))
  .filter((f: string) => f.endsWith(".src.js"))
  .reduce((acc: Record<string, string>, f: string) => {
    const name = f.replace(".src.js", "");
    acc[`highcharts/modules/${name}`] = hcEsm(`modules/${f}`);
    return acc;
  }, {} as Record<string, string>);

export default defineConfig({
  plugins: [react(), viteSingleFile()],
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
