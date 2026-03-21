import type { Plugin } from "vite";

/**
 * Ordered list of all available Highcharts modules.
 * Order matters — modules with dependencies must come after their deps.
 * "root" modules live at highcharts/<name>, regular ones at highcharts/modules/<name>.
 */
const ALL_MODULES = [
  // Root-level extensions (not under modules/)
  "highcharts-more",
  "highcharts-3d",
  // Standard modules — dependency order
  "accessibility",
  "annotations",
  "bullet",
  "coloraxis",
  "cylinder",         // requires highcharts-3d
  "data",
  "drilldown",
  "dumbbell",
  "exporting",
  "export-data",      // requires exporting
  "offline-exporting", // requires exporting
  "funnel",
  "funnel3d",         // requires highcharts-3d, cylinder
  "gantt",
  "heatmap",
  "tilemap",          // requires heatmap
  "histogram-bellcurve",
  "item-series",
  "lollipop",
  "networkgraph",
  "no-data-to-display",
  "pareto",
  "pattern-fill",
  "sankey",
  "arc-diagram",      // requires sankey
  "dependency-wheel", // requires sankey
  "organization",     // requires sankey
  "series-label",
  "solid-gauge",
  "streamgraph",
  "sunburst",
  "timeline",
  "treegraph",
  "treemap",
  "variable-pie",
  "variwide",
  "vector",
  "venn",
  "windbarb",
  "wordcloud",
  "xrange",
  "map",
  "flowmap",
  "geoheatmap",
  "pictorial",
  "pyramid3d",        // requires highcharts-3d, cylinder, funnel3d
  "tiledwebmap",
] as const;

const ROOT_MODULES = new Set(["highcharts-more", "highcharts-3d"]);

// Auto-resolve dependencies so users don't have to remember the chain
const DEPS: Record<string, string[]> = {
  "cylinder":         ["highcharts-3d"],
  "funnel3d":         ["highcharts-3d", "cylinder"],
  "pyramid3d":        ["highcharts-3d", "cylinder", "funnel3d"],
  "arc-diagram":      ["sankey"],
  "dependency-wheel": ["sankey"],
  "organization":     ["sankey"],
  "tilemap":          ["heatmap"],
  "export-data":      ["exporting"],
  "offline-exporting": ["exporting"],
};

const VIRTUAL_ID = "virtual:highcharts-modules";

export function highchartsModulesPlugin(): Plugin {
  const env = process.env.HIGHCHARTS_MODULES?.trim();
  const useAll = !env || env === "all";

  let selected: Set<string>;
  if (useAll) {
    selected = new Set(ALL_MODULES);
  } else {
    selected = new Set<string>();
    for (const m of env.split(",").map(s => s.trim()).filter(Boolean)) {
      // Recursively add deps
      const addWithDeps = (mod: string) => {
        if (selected.has(mod)) return;
        for (const dep of DEPS[mod] ?? []) addWithDeps(dep);
        selected.add(mod);
      };
      addWithDeps(m);
    }
  }

  // Maintain correct load order from ALL_MODULES
  const ordered = ALL_MODULES.filter(m => selected.has(m));

  const code = ordered
    .map(m => ROOT_MODULES.has(m)
      ? `import "highcharts/${m}";`
      : `import "highcharts/modules/${m}";`)
    .join("\n");

  return {
    name: "highcharts-modules",
    resolveId(id) {
      if (id === VIRTUAL_ID) return "\0" + VIRTUAL_ID;
    },
    load(id) {
      if (id === "\0" + VIRTUAL_ID) return code || "// no modules selected";
    },
  };
}
