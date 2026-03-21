import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import fs from "node:fs";
import type { Plugin } from "vite";

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

// ── Highcharts modules virtual plugin ──
// Generates import statements for all (or selected) Highcharts modules in dependency order.

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
  const env = process.env.HIGHCHARTS_MODULES?.trim();
  const useAll = !env || env === "all";

  let selected: Set<string>;
  if (useAll) {
    selected = new Set(ALL_MODULES);
  } else {
    selected = new Set<string>();
    for (const m of env.split(",").map(s => s.trim()).filter(Boolean)) {
      const addWithDeps = (mod: string) => {
        if (selected.has(mod)) return;
        for (const dep of DEPS[mod] ?? []) addWithDeps(dep);
        selected.add(mod);
      };
      addWithDeps(m);
    }
  }

  const ordered = ALL_MODULES.filter(m => selected.has(m));
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
  plugins: [viteSingleFile(), highchartsModulesPlugin()],
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
    inconsistentCjsInterop: true,
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
