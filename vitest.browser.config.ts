import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import fs from "node:fs";
import type { Plugin } from "vite";

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

const ALL_MODULES = [
  "highcharts-more", "highcharts-3d",
  "accessibility", "annotations", "bullet", "coloraxis",
  "cylinder", "data", "drilldown", "dumbbell", "exporting",
  "export-data", "offline-exporting", "funnel", "funnel3d",
  "gantt", "heatmap", "tilemap", "histogram-bellcurve",
  "item-series", "lollipop", "networkgraph", "no-data-to-display",
  "pareto", "pattern-fill", "sankey", "arc-diagram",
  "dependency-wheel", "organization", "series-label", "solid-gauge",
  "streamgraph", "sunburst", "timeline", "treegraph", "treemap",
  "variable-pie", "variwide", "vector", "venn", "windbarb",
  "wordcloud", "xrange", "map", "flowmap", "geoheatmap",
  "pictorial", "pyramid3d", "tiledwebmap",
] as const;

const ROOT_MODULES = new Set(["highcharts-more", "highcharts-3d"]);

const DEPS: Record<string, string[]> = {
  cylinder: ["highcharts-3d"],
  funnel3d: ["highcharts-3d", "cylinder"],
  pyramid3d: ["highcharts-3d", "cylinder", "funnel3d"],
  "arc-diagram": ["sankey"],
  "dependency-wheel": ["sankey"],
  organization: ["sankey"],
  tilemap: ["heatmap"],
  "export-data": ["exporting"],
  "offline-exporting": ["exporting"],
};

function highchartsModulesPlugin(): Plugin {
  const ordered = [...ALL_MODULES];
  const code = ordered
    .map(m => ROOT_MODULES.has(m)
      ? `import "highcharts/${m}";`
      : `import "highcharts/modules/${m}";`)
    .join("\n");

  const VIRTUAL_ID = "virtual:highcharts-modules";
  return {
    name: "highcharts-modules",
    resolveId(id) { if (id === VIRTUAL_ID) return "\0" + VIRTUAL_ID; },
    load(id) { if (id === "\0" + VIRTUAL_ID) return code || "// no modules"; },
  };
}

export default defineConfig({
  plugins: [react(), highchartsModulesPlugin()],
  resolve: {
    alias: {
      "highcharts/highcharts-more": hcEsm("highcharts-more.src.js"),
      "highcharts/highcharts-3d": hcEsm("highcharts-3d.src.js"),
      ...buildAliases("modules", "highcharts/modules"),
      ...buildAliases("themes", "highcharts/themes"),
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
